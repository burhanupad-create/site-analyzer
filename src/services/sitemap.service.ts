import * as xml2js from "xml2js";
import {
  ensureAbsoluteUrl,
  classifyExcludedUrl,
  isSameDomain,
  normalizeUrl,
} from "@/lib/url-utils";
import {
  MAX_TOTAL_URLS,
  SITEMAP_TIMEOUT_MS,
} from "@/lib/constants";
import type { SkipReason } from "@/types";

// ─── Result Type ──────────────────────────────────────────────────────────────

export interface SitemapCrawlResult {
  urls: string[];
  sitemapUrl: string;
  truncated: boolean;
  totalRaw: number;           // total URLs before filtering/limiting
  skippedReasons: SkipReason[];
}

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  timeoutMs = SITEMAP_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SiteAnalyzer/1.0 (performance audit tool)" },
    });
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── XML Parser ───────────────────────────────────────────────────────────────

async function parseSitemapXml(xml: string, baseUrl: string): Promise<string[]> {
  const parser = new xml2js.Parser({ explicitArray: true });
  const result = await parser.parseStringPromise(xml);
  const urls: string[] = [];

  // Sitemap index — contains child sitemap URLs
  if (result.sitemapindex?.sitemap) {
    const childSitemapUrls: string[] = result.sitemapindex.sitemap
      .map((s: { loc?: string[] }) => s.loc?.[0])
      .filter(Boolean);

    // Cap child sitemaps to avoid runaway fetching
    for (const childUrl of childSitemapUrls.slice(0, 5)) {
      try {
        const childUrls = await fetchSitemapUrls(childUrl, baseUrl);
        urls.push(...childUrls);
      } catch (err) {
        console.warn(`[sitemap] Failed to fetch child sitemap ${childUrl}:`, err);
      }
    }
    return urls;
  }

  // Regular urlset
  if (result.urlset?.url) {
    for (const entry of result.urlset.url) {
      const loc = entry.loc?.[0];
      if (loc) urls.push(loc.trim());
    }
  }

  return urls;
}

async function fetchSitemapUrls(
  sitemapUrl: string,
  baseUrl: string
): Promise<string[]> {
  const res = await fetchWithTimeout(sitemapUrl);
  if (!res.ok) {
    console.warn(`[sitemap] ${sitemapUrl} returned ${res.status}`);
    return [];
  }

  const text = await res.text();

  if (text.trim().startsWith("<?xml") || text.includes("<urlset")) {
    try {
      return await parseSitemapXml(text, baseUrl);
    } catch (err) {
      console.warn(`[sitemap] XML parse failed for ${sitemapUrl}:`, err);
    }
  }

  // Plain text sitemap (one URL per line)
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("http"));
}

// ─── Discovery ────────────────────────────────────────────────────────────────

async function discoverSitemapUrl(siteUrl: string): Promise<string | null> {
  const origin = new URL(normalizeUrl(siteUrl)).origin;

  // 1. Check robots.txt first
  try {
    const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`);
    if (robotsRes.ok) {
      const text = await robotsRes.text();
      const match = text.match(/^Sitemap:\s*(.+)$/im);
      if (match) {
        console.log(`[sitemap] Found via robots.txt: ${match[1].trim()}`);
        return match[1].trim();
      }
    }
  } catch (err) {
    console.warn("[sitemap] robots.txt fetch failed:", err);
  }

  // 2. Try well-known paths
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
    `${origin}/sitemaps/sitemap.xml`,
    `${origin}/wp-sitemap.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetchWithTimeout(candidate);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<url") || text.includes("<sitemap")) {
          console.log(`[sitemap] Found at: ${candidate}`);
          return candidate;
        }
      }
    } catch {
      // Continue trying other candidates
    }
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function discoverAndCrawlSitemap(
  siteUrl: string
): Promise<SitemapCrawlResult> {
  const sitemapUrl = await discoverSitemapUrl(siteUrl);
  if (!sitemapUrl) {
    throw new Error(
      "No sitemap found. Ensure the site has a sitemap.xml or a Sitemap: directive in robots.txt."
    );
  }

  const origin = new URL(normalizeUrl(siteUrl)).origin;
  const rawUrls = await fetchSitemapUrls(sitemapUrl, origin);
  const totalRaw = rawUrls.length;

  const seen = new Set<string>();
  const urls: string[] = [];
  const skippedReasons: SkipReason[] = [];

  for (const raw of rawUrls) {
    const abs = ensureAbsoluteUrl(origin, raw);

    if (!isSameDomain(siteUrl, abs)) {
      skippedReasons.push({ url: abs, reason: "external-domain" });
      continue;
    }

    const exclusion = classifyExcludedUrl(abs);
    if (exclusion.excluded) {
      skippedReasons.push({
        url: abs,
        reason: exclusion.reason ?? "excluded-path-or-extension",
        pattern: exclusion.pattern,
      });
      continue;
    }

    const norm = normalizeUrl(abs);
    if (seen.has(norm)) {
      skippedReasons.push({ url: abs, reason: "duplicate" });
      continue;
    }

    seen.add(norm);
    urls.push(norm);
  }

  // Apply hard cap
  let truncated = false;
  if (urls.length > MAX_TOTAL_URLS) {
    console.warn(
      `[sitemap] Truncating ${urls.length} URLs to MAX_TOTAL_URLS=${MAX_TOTAL_URLS}`
    );
    const excess = urls.splice(MAX_TOTAL_URLS);
    for (const u of excess) {
      skippedReasons.push({ url: u, reason: "limit-exceeded" });
    }
    truncated = true;
  }

  return { urls, sitemapUrl, truncated, totalRaw, skippedReasons };
}
