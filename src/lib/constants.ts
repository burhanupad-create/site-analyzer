// ─── Sitemap Exclusions ────────────────────────────────────────────────────────

export const EXCLUDED_FOLDERS = [
  "/blog",
  "/news",
  "/tag",
  "/tags",
  "/category",
  "/categories",
  "/author",
  "/authors",
  "/feed",
  "/rss",
  "/wp-content",
  "/wp-includes",
  "/wp-json",
  "/amp",
  "/cdn-cgi",
];

export const EXCLUDED_EXTENSIONS = [
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
  ".css", ".js", ".xml", ".json", ".txt", ".zip", ".mp4", ".mp3",
  ".woff", ".woff2", ".ttf", ".eot",
];

// ─── Hard Processing Limits ────────────────────────────────────────────────────
// These protect against huge sitemaps overwhelming the PSI quota.

/** Maximum unique URLs kept after sitemap crawl */
export const MAX_TOTAL_URLS = 100;

/** Maximum distinct folder groups analyzed */
export const MAX_GROUPS = 20;

/** Maximum pages sampled per folder group for PSI analysis */
export const MAX_PAGES_PER_GROUP = 5;

// ─── PSI Configuration ────────────────────────────────────────────────────────

export const PSI_CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];

/** Default strategy — overridden per-request by the strategy selector */
export const DEFAULT_PSI_STRATEGY = "mobile" as const;

/** Concurrent PSI requests in flight at once (quota-friendly) */
export const PSI_CONCURRENCY = 5;

// ─── Timeouts ────────────────────────────────────────────────────────────────

export const SITEMAP_TIMEOUT_MS = 10_000;
export const PSI_TIMEOUT_MS = 60_000;
export const PDF_TIMEOUT_MS = 30_000;

// ─── Score Thresholds ─────────────────────────────────────────────────────────

export const SCORE_THRESHOLDS = {
  good: 90,
  needsImprovement: 50,
};

// ─── Important Pages ──────────────────────────────────────────────────────────
// These paths are always prioritized in sampling even if the sitemap buries them.

export const IMPORTANT_PATHS = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/services",
  "/features",
  "/solutions",
  "/product",
  "/products",
];

// ─── PSI Cache ────────────────────────────────────────────────────────────────

/** TTL for PSI response cache (12 hours in ms) */
export const PSI_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;
