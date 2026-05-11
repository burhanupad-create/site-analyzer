// ─── Sitemap Exclusions ────────────────────────────────────────────────────────
// These paths are filtered out before PSI calls to save quota and focus reports
// on high-value business/product pages.

// Content & archive paths — CMS-generated, high volume, low business value
const CONTENT_PATHS = [
  "/blog", "/blogs",
  "/post", "/posts",
  "/news",
  "/article", "/articles",
  "/press", "/press-release", "/press-releases",
  "/media",
  "/case-study", "/case-studies",
  "/webinar", "/webinars",
  "/events", "/event",
  "/podcast", "/podcasts",
];

// Taxonomy paths — tag/category archives repeat content already covered elsewhere
const TAXONOMY_PATHS = [
  "/author", "/authors",
  "/tag", "/tags",
  "/category", "/categories",
  "/archive", "/archives",
];

// Pagination — /page/ in the middle of a path (e.g. /blog/page/2)
// Trailing slash intentional: matched with includes() not startsWith()
const PAGINATION_PATHS = ["/page/"];

// Search & utility paths — generated on demand, not representative pages
const UTILITY_PATHS = [
  "/search", "/search-results",
  "/feed", "/rss",
  "/amp",
  "/sitemap",
];

// Campaign / transactional pages — not representative of core site experience
const CAMPAIGN_PATHS = [
  "/campaign", "/landing-page",
  "/thank-you", "/thankyou",
  "/preview", "/draft",
];

// Auth & account pages — behind auth, meaningless to analyze publicly
const AUTH_PATHS = [
  "/admin", "/login", "/signin", "/signup",
  "/cart", "/checkout",
  "/account", "/profile",
];

// Legal & CMS system pages — low traffic, no performance signal value
const SYSTEM_PATHS = [
  "/privacy-policy", "/terms", "/cookie-policy",
  "/wp-content", "/wp-admin", "/wp-json",
  "/cdn-cgi",
];

export const EXCLUDED_PATH_SEGMENTS: string[] = [
  ...CONTENT_PATHS,
  ...TAXONOMY_PATHS,
  ...PAGINATION_PATHS,
  ...UTILITY_PATHS,
  ...CAMPAIGN_PATHS,
  ...AUTH_PATHS,
  ...SYSTEM_PATHS,
];

// Paths that are ALWAYS kept, even if they could match an exclusion pattern.
// These are core commercial pages that must appear in every report.
export const PROTECTED_PATHS = [
  "/",
  "/product", "/products",
  "/solution", "/solutions",
  "/pricing", "/features", "/services",
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
