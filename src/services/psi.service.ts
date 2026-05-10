import type {
  CategoryScores,
  LighthouseOpportunity,
  PageScore,
  PsiPageError,
  PsiStrategy,
} from "@/types";
import https from "node:https";
import { PSI_CATEGORIES, PSI_TIMEOUT_MS } from "@/lib/constants";
import { getCached, setCached } from "@/lib/psi-cache";

const PSI_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const DEBUG = process.env.DEBUG_PSI === "true";

// ─── Native HTTPS helper ──────────────────────────────────────────────────────
// Uses node:https directly to avoid Next.js's patched fetch, which adds
// HMR instrumentation overhead that can cause long-running PSI requests to time out.

function httpsGetText(url: string, signal: AbortSignal): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: "application/json" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("error", reject);
    signal.addEventListener("abort", () => req.destroy(Object.assign(new Error("AbortError"), { name: "AbortError" })));
  });
}

// ─── Structured logger ────────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", tag: string, data: Record<string, unknown>) {
  const prefix = `[psi:${tag}]`;
  if (level === "error") console.error(prefix, data);
  else if (level === "warn") console.warn(prefix, data);
  else if (DEBUG) console.log(prefix, data);
}

// ─── Error classifier ─────────────────────────────────────────────────────────

export function classifyPsiError(message: string): Pick<PsiPageError, "isQuotaError" | "isTimeoutError"> {
  const lower = message.toLowerCase();
  return {
    isQuotaError:
      lower.includes("quota") ||
      lower.includes("429") ||
      lower.includes("rate limit") ||
      lower.includes("resource_exhausted"),
    isTimeoutError: lower.includes("timeout") || lower.includes("timed out") || lower.includes("aborted"),
  };
}

// ─── URL Builder ──────────────────────────────────────────────────────────────

function buildPsiUrl(pageUrl: string, strategy: PsiStrategy, apiKey?: string): string {
  const params = new URLSearchParams({ url: pageUrl, strategy });
  PSI_CATEGORIES.forEach((cat) => params.append("category", cat));
  if (apiKey) params.set("key", apiKey);
  return `${PSI_API_BASE}?${params}`;
}

// ─── Response Types ───────────────────────────────────────────────────────────

type AuditMap = Record<string, {
  numericValue?: number;
  displayValue?: string;
  title?: string;
  details?: {
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  };
}>;
type CategoryMap = Record<string, { score?: number | null }>;

interface PsiApiResponse {
  lighthouseResult?: {
    categories?: CategoryMap;
    audits?: AuditMap;
    finalUrl?: string;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseCategories(categories: CategoryMap): CategoryScores {
  // Lighthouse scores are 0–1 decimals — multiply by 100 and round
  const score = (key: string): number => {
    const raw = categories[key]?.score;
    if (raw == null) return 0;
    return Math.round(raw * 100);
  };
  return {
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    seo: score("seo"),
  };
}

function extractAuditValue(audits: AuditMap, id: string): number | undefined {
  const v = audits[id]?.numericValue;
  return typeof v === "number" ? Math.round(v) : undefined;
}

const OPPORTUNITY_IDS = [
  "render-blocking-resources",
  "unused-javascript",
  "unused-css-rules",
  "uses-optimized-images",
  "uses-webp-images",
  "uses-text-compression",
  "uses-responsive-images",
  "unminified-javascript",
  "unminified-css",
  "server-response-time",
  "redirects",
  "bootup-time",
  "mainthread-work-breakdown",
];

function parseOpportunities(audits: AuditMap): LighthouseOpportunity[] {
  const opps: LighthouseOpportunity[] = [];
  for (const id of OPPORTUNITY_IDS) {
    const audit = audits[id];
    if (!audit) continue;

    const savingsMs =
      audit.details?.overallSavingsMs ??
      (typeof audit.numericValue === "number" && audit.numericValue > 0
        ? audit.numericValue
        : 0);
    if (savingsMs <= 0) continue;

    opps.push({
      id,
      title: audit.title ?? id.replace(/-/g, " "),
      description: audit.displayValue ?? "",
      savingsMs: Math.round(savingsMs),
      savingsBytes: audit.details?.overallSavingsBytes
        ? Math.round(audit.details.overallSavingsBytes)
        : undefined,
    });
  }
  return opps;
}

// ─── Core Analyzer ────────────────────────────────────────────────────────────

export async function analyzePageWithPsi(
  pageUrl: string,
  strategy: PsiStrategy,
  apiKey?: string
): Promise<PageScore> {
  // Cache check
  const cached = await getCached(pageUrl, strategy);
  if (cached.hit) {
    log("info", "cache-hit", { url: pageUrl, strategy });
    return cached.score;
  }

  const apiUrl = buildPsiUrl(pageUrl, strategy, apiKey);
  log("info", "request", { url: pageUrl, strategy, hasKey: !!apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const { status, body: bodyText } = await httpsGetText(apiUrl, controller.signal);

    if (DEBUG) {
      log("info", "raw-response", { url: pageUrl, status, body: bodyText.slice(0, 500) });
    }

    // Parse the body regardless of status — Google returns error details in JSON even on 4xx
    let data: PsiApiResponse;
    try {
      data = JSON.parse(bodyText) as PsiApiResponse;
    } catch {
      throw new Error(`PSI API ${status}: non-JSON response — ${bodyText.slice(0, 200)}`);
    }

    // Surface Google API errors with full detail
    if (status < 200 || status >= 300 || data.error) {
      const apiError = data.error;
      const message = apiError
        ? `PSI API ${apiError.code} (${apiError.status}): ${apiError.message}`
        : `PSI API ${status}: ${bodyText.slice(0, 200)}`;

      log("error", "api-error", {
        url: pageUrl,
        strategy,
        status,
        apiErrorCode: apiError?.code,
        apiErrorStatus: apiError?.status,
        message,
      });

      throw new Error(message);
    }

    // Validate response shape before destructuring
    if (!data.lighthouseResult) {
      log("error", "no-lighthouse-result", { url: pageUrl, strategy, keys: Object.keys(data) });
      throw new Error("PSI API returned no lighthouseResult — the page may be unreachable or blocked");
    }

    const { categories, audits } = data.lighthouseResult;

    if (!categories) {
      throw new Error("PSI API returned lighthouseResult with no categories");
    }
    if (!audits) {
      throw new Error("PSI API returned lighthouseResult with no audits");
    }

    const scores = parseCategories(categories);

    log("info", "success", { url: pageUrl, strategy, scores });

    const score: PageScore = {
      url: pageUrl,
      ...scores,
      lcp: extractAuditValue(audits, "largest-contentful-paint"),
      fid: extractAuditValue(audits, "max-potential-fid"),
      cls: audits["cumulative-layout-shift"]?.numericValue != null
        ? parseFloat(audits["cumulative-layout-shift"].numericValue.toFixed(3))
        : undefined,
      ttfb: extractAuditValue(audits, "server-response-time"),
      fcp: extractAuditValue(audits, "first-contentful-paint"),
      tbt: extractAuditValue(audits, "total-blocking-time"),
      si: extractAuditValue(audits, "speed-index"),
      opportunities: parseOpportunities(audits),
      fromCache: false,
    };

    // Cache asynchronously — don't block return
    setCached(pageUrl, strategy, score).catch((err) =>
      log("warn", "cache-set-failed", { url: pageUrl, error: String(err) })
    );

    return score;
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof Error && err.name === "AbortError") {
      const msg = `PSI request timed out after ${PSI_TIMEOUT_MS / 1000}s`;
      log("error", "timeout", { url: pageUrl, strategy, timeoutMs: PSI_TIMEOUT_MS });
      return errorScore(pageUrl, msg);
    }

    const message = err instanceof Error ? err.message : String(err);
    // Only log if we haven't already logged above (avoid double-logging)
    if (!(err instanceof Error && err.message.startsWith("PSI API"))) {
      log("error", "unexpected", { url: pageUrl, strategy, error: message });
    }
    return errorScore(pageUrl, message);
  } finally {
    clearTimeout(timer);
  }
}

function errorScore(url: string, error: string): PageScore {
  return { url, performance: 0, accessibility: 0, bestPractices: 0, seo: 0, error };
}

// ─── Score Utilities ──────────────────────────────────────────────────────────

export function averageScores(scores: PageScore[]): CategoryScores {
  const valid = scores.filter((s) => !s.error);
  if (valid.length === 0) {
    return { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  }
  const sum = valid.reduce(
    (acc, s) => ({
      performance: acc.performance + s.performance,
      accessibility: acc.accessibility + s.accessibility,
      bestPractices: acc.bestPractices + s.bestPractices,
      seo: acc.seo + s.seo,
    }),
    { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 }
  );
  return {
    performance: Math.round(sum.performance / valid.length),
    accessibility: Math.round(sum.accessibility / valid.length),
    bestPractices: Math.round(sum.bestPractices / valid.length),
    seo: Math.round(sum.seo / valid.length),
  };
}
