import { EXCLUDED_EXTENSIONS, EXCLUDED_PATH_SEGMENTS, PROTECTED_PATHS, IMPORTANT_PATHS } from "./constants";

// ─── Normalization ────────────────────────────────────────────────────────────

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const pathname = parsed.pathname.replace(/\/$/, "") || "/";
    // Strip query params and fragments — we compare structural URLs only
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return url.trim();
  }
}

// ─── UUID / Slug Detection ────────────────────────────────────────────────────

/** Matches UUIDs and long hex/numeric ids that indicate a CMS detail page */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_ID_RE = /^[0-9a-f]{16,}$/i;
const PURELY_NUMERIC_RE = /^\d+$/;

function isSlugSegment(segment: string): boolean {
  return (
    UUID_RE.test(segment) ||
    LONG_ID_RE.test(segment) ||
    // Very long segments (> 40 chars) are almost always generated IDs
    segment.length > 40 ||
    // Purely numeric segments are likely IDs (/products/12345)
    PURELY_NUMERIC_RE.test(segment)
  );
}

// ─── Folder Grouping ──────────────────────────────────────────────────────────

/**
 * Returns the canonical first-level folder for a URL.
 *
 * Improvements over the original:
 * - Strips query params and hashes before parsing
 * - Skips UUID/ID-like first segments (falls back to "/")
 * - Preserves homepage grouping as "/"
 *
 * Examples:
 *   /products/item-a          → /products
 *   /products/12345           → /products   (numeric id, still groups)
 *   /a1b2c3d4e5f6...          → /           (looks like a UUID slug at root)
 *   /?utm_source=google       → /
 */
export function getFirstLevelFolder(url: string): string {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 0) return "/";

    const first = parts[0];

    // Don't create a group for UUID-like root segments
    if (isSlugSegment(first)) return "/";

    return `/${first}`;
  } catch {
    return "/";
  }
}

export function getFolderLabel(folder: string): string {
  if (folder === "/") return "Homepage / Root";
  return folder
    .replace(/^\//, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Exclusion Filters ────────────────────────────────────────────────────────

const SUSPICIOUS_PARAMS = new Set([
  "p", "page", "offset", "paged", "s", "search", "q", "query",
]);

export interface ExclusionResult {
  excluded: boolean;
  reason?: string;
  pattern?: string;
}

/**
 * Returns why a URL was excluded (or not). Query params and hashes are stripped
 * before matching. Protected commercial paths are never excluded.
 */
export function classifyExcludedUrl(url: string): ExclusionResult {
  try {
    const parsed = new URL(url);
    // Matching is done on the pathname only — ignore query params and hashes
    const lower = parsed.pathname.toLowerCase();

    // Protected paths are always kept regardless of any pattern match
    if (PROTECTED_PATHS.some((p) => lower === p || lower.startsWith(p + "/"))) {
      return { excluded: false };
    }

    // File extension check
    if (EXCLUDED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      const ext = lower.slice(lower.lastIndexOf("."));
      return { excluded: true, reason: "excluded-extension", pattern: ext };
    }

    // Path segment check (case-insensitive, query-param-stripped)
    for (const pattern of EXCLUDED_PATH_SEGMENTS) {
      if (pattern.endsWith("/")) {
        // Pagination-style: pattern can appear anywhere in the path
        if (lower.includes(pattern)) {
          return { excluded: true, reason: "excluded-path", pattern };
        }
      } else {
        // Prefix-style: pattern must be an exact match or a path prefix
        if (lower === pattern || lower.startsWith(pattern + "/")) {
          return { excluded: true, reason: "excluded-path", pattern };
        }
      }
    }

    // CMS pagination/filter params
    for (const [key] of parsed.searchParams) {
      if (SUSPICIOUS_PARAMS.has(key.toLowerCase())) {
        return { excluded: true, reason: "cms-param", pattern: `?${key}` };
      }
    }

    return { excluded: false };
  } catch {
    return { excluded: false };
  }
}

export function isExcludedUrl(url: string): boolean {
  return classifyExcludedUrl(url).excluded;
}

// ─── Domain Helpers ───────────────────────────────────────────────────────────

export function ensureAbsoluteUrl(base: string, href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

export function isSameDomain(base: string, url: string): boolean {
  try {
    return new URL(base).host === new URL(url).host;
  } catch {
    return false;
  }
}

// ─── Sampling ─────────────────────────────────────────────────────────────────

/**
 * Evenly samples n items from an array by stepping through it.
 * Important pages are always included if present in the array.
 */
export function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = Math.floor(arr.length / n);
  return Array.from({ length: n }, (_, i) => arr[i * step]);
}

// ─── Important Pages ──────────────────────────────────────────────────────────

/**
 * Returns true if a URL matches one of the pre-defined important paths.
 * Comparison ignores trailing slashes and is case-insensitive.
 */
export function isImportantPage(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "") || "/";
    return IMPORTANT_PATHS.some(
      (p) => p.toLowerCase() === pathname.toLowerCase()
    );
  } catch {
    return false;
  }
}

/**
 * Reorders a URL list so important pages come first.
 * Used before sampling so they're always included in the sample set.
 */
export function prioritizeImportantPages(urls: string[]): string[] {
  const important = urls.filter(isImportantPage);
  const rest = urls.filter((u) => !isImportantPage(u));
  return [...important, ...rest];
}
