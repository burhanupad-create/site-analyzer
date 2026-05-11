// ─── Core Job Types ────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "selecting" | "running" | "completed" | "failed";
export type PsiStrategy = "mobile" | "desktop";

export interface AnalysisJob {
  id: string;
  url: string;
  strategy: PsiStrategy;
  status: JobStatus;
  progress: number; // 0-100
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  report?: SiteReport;
  // Populated after sitemap crawl, before PSI analysis starts
  discoveredUrls?: string[];
  skippedReasons?: SkipReason[];
  truncated?: boolean;
  totalRaw?: number;
  sitemapUrl?: string;
  apiKey?: string; // ephemeral — cleared after analysis starts
}

// ─── Report ────────────────────────────────────────────────────────────────────

export interface SiteReport {
  siteUrl: string;
  strategy: PsiStrategy;
  analyzedAt: string;
  totalUrlsCrawled: number;
  totalUrlsAnalyzed: number;
  homepageScore?: PageScore;
  homepageScreenshotBase64?: string; // included in PDF only
  folders: FolderReport[];
  recommendations: Recommendation[];
  topIssues: TopIssue[];
  overallScore: number;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  totalUrlsDiscovered: number;
  totalUrlsAnalyzed: number;
  successfulPages: number;
  failedPages: number;
  psiErrors: PsiPageError[];
  skippedUrls: number;
  skippedReasons: SkipReason[];
  excludedPatternMatches: Array<{ url: string; pattern: string }>;
  strategy: PsiStrategy;
  generatedAt: string;
  durationMs: number;
  truncated: boolean;
  importantPagesFound: string[];
  cacheHits: number;
  hasApiKey: boolean;
}

export interface PsiPageError {
  url: string;
  error: string;
  isQuotaError: boolean;
  isTimeoutError: boolean;
}

export interface SkipReason {
  url: string;
  reason: string;
  pattern?: string;
}

// ─── Folder / Page Scores ──────────────────────────────────────────────────────

export interface FolderReport {
  folder: string;       // "/" for root, "/about" etc
  label: string;        // human-readable
  sampleUrls: string[];
  scores: PageScore[];
  averageScore: CategoryScores;
  grade: PerformanceGrade;
  pageCount: number;    // total pages in folder, not just sampled
  isImportant: boolean;
  /** True when every sampled page returned a PSI error (no real scores) */
  allFailed: boolean;
}

export interface PageScore {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcp?: number;   // ms
  fid?: number;   // ms
  cls?: number;
  ttfb?: number;  // ms
  fcp?: number;   // ms
  tbt?: number;   // ms
  si?: number;    // ms
  opportunities?: LighthouseOpportunity[];
  error?: string;
  fromCache?: boolean;
}

export interface CategoryScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

// ─── Lighthouse Savings ────────────────────────────────────────────────────────

export interface LighthouseOpportunity {
  id: string;
  title: string;
  description: string;
  savingsMs: number;       // estimated time savings in ms
  savingsBytes?: number;   // estimated byte savings
}

// ─── Top Issues Aggregation ────────────────────────────────────────────────────

export interface TopIssue {
  id: string;
  title: string;
  occurrences: number;
  avgSavingsMs: number;
  totalSavingsMs: number;
  affectedUrls: string[];
}

// ─── Grade System ─────────────────────────────────────────────────────────────

export type PerformanceGrade = "A" | "B" | "C" | "D";

// ─── Recommendations ──────────────────────────────────────────────────────────

export type RecommendationSeverity = "critical" | "warning" | "info";
export type RecommendationCategory =
  | "performance"
  | "accessibility"
  | "seo"
  | "best-practices"
  | "general";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  severity: RecommendationSeverity;
  category: RecommendationCategory;
  affectedFolders?: string[];
  score?: number;
  savingsMs?: number;   // estimated performance savings
  savingsKb?: number;   // estimated byte savings
}

// ─── Progress / SSE ───────────────────────────────────────────────────────────

export interface ProgressEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  currentStep: string;
  error?: string;
}

// ─── Error Metadata ───────────────────────────────────────────────────────────

export interface AnalysisError {
  url: string;
  error: string;
  stage: "sitemap" | "psi" | "pdf" | "report";
  timestamp: string;
}

// ─── Rate Limiting (architecture hook) ────────────────────────────────────────

export interface RateLimitConfig {
  identifier: string;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ─── Future Integrations ──────────────────────────────────────────────────────

export interface DataSource {
  type: "psi" | "ga4" | "gsc";
  enabled: boolean;
  credentials?: Record<string, string>;
}
