import pLimit from "p-limit";
import {
  CategoryScores,
  FolderReport,
  PageScore,
  PerformanceGrade,
  PsiPageError,
  PsiStrategy,
  Recommendation,
  RecommendationCategory,
  RecommendationSeverity,
  ReportMetadata,
  SiteReport,
  SkipReason,
  TopIssue,
} from "@/types";
import { classifyPsiError } from "./psi.service";
import {
  MAX_GROUPS,
  MAX_PAGES_PER_GROUP,
  PSI_CONCURRENCY,
  SCORE_THRESHOLDS,
} from "@/lib/constants";
import {
  getFolderLabel,
  getFirstLevelFolder,
  isImportantPage,
  prioritizeImportantPages,
  sampleArray,
} from "@/lib/url-utils";
import { categoryScoresToGrade } from "@/lib/grading";
import { analyzePageWithPsi, averageScores } from "./psi.service";

// ─── Input ────────────────────────────────────────────────────────────────────

export interface AnalysisInput {
  siteUrl: string;
  urls: string[];
  strategy: PsiStrategy;
  apiKey?: string;
  onProgress?: (completed: number, total: number, currentUrl: string) => void;
  /** Skipped URLs from sitemap crawl — included in metadata */
  skippedReasons?: SkipReason[];
  truncated?: boolean;
  totalRaw?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeOverall(scores: CategoryScores): number {
  return Math.round(
    (scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4
  );
}

// ─── Folder Grouping ──────────────────────────────────────────────────────────

function groupUrlsByFolder(urls: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const url of urls) {
    const folder = getFirstLevelFolder(url);
    const existing = map.get(folder) ?? [];
    existing.push(url);
    map.set(folder, existing);
  }
  return map;
}

// ─── Top Issues Aggregation ───────────────────────────────────────────────────

function aggregateTopIssues(allScores: PageScore[]): TopIssue[] {
  const byId = new Map<
    string,
    { title: string; totalSavingsMs: number; urls: string[] }
  >();

  for (const score of allScores) {
    if (!score.opportunities) continue;
    for (const opp of score.opportunities) {
      const entry = byId.get(opp.id) ?? {
        title: opp.title,
        totalSavingsMs: 0,
        urls: [],
      };
      entry.totalSavingsMs += opp.savingsMs;
      entry.urls.push(score.url);
      byId.set(opp.id, entry);
    }
  }

  return Array.from(byId.entries())
    .map(([id, { title, totalSavingsMs, urls }]) => ({
      id,
      title,
      occurrences: urls.length,
      avgSavingsMs: Math.round(totalSavingsMs / urls.length),
      totalSavingsMs,
      affectedUrls: [...new Set(urls)].slice(0, 10),
    }))
    .filter((issue) => issue.occurrences >= 1)
    .sort((a, b) => b.occurrences - a.occurrences || b.totalSavingsMs - a.totalSavingsMs)
    .slice(0, 10);
}

// ─── Recommendations Builder ──────────────────────────────────────────────────

function buildRecommendations(
  folders: FolderReport[],
  topIssues: TopIssue[],
  homepageScore?: PageScore
): Recommendation[] {
  const recs: Recommendation[] = [];
  let counter = 0;
  const nextId = () => `rec-${++counter}`;

  function add(
    title: string,
    description: string,
    impact: string,
    severity: RecommendationSeverity,
    category: RecommendationCategory,
    opts: {
      affectedFolders?: string[];
      score?: number;
      savingsMs?: number;
      savingsKb?: number;
    } = {}
  ) {
    recs.push({ id: nextId(), title, description, impact, severity, category, ...opts });
  }

  // ── Performance (folder-level) ─────────────────────────────────────────────

  const slowFolders = folders.filter(
    (f) => f.averageScore.performance < SCORE_THRESHOLDS.needsImprovement
  );
  const mediumFolders = folders.filter(
    (f) =>
      f.averageScore.performance >= SCORE_THRESHOLDS.needsImprovement &&
      f.averageScore.performance < SCORE_THRESHOLDS.good
  );

  if (slowFolders.length > 0) {
    add(
      "Critical performance issues detected",
      `Pages in ${slowFolders.map((f) => f.label).join(", ")} scored below 50 for performance. ` +
        "Focus on reducing render-blocking resources, optimizing images, and enabling compression.",
      "High — poor performance directly impacts conversions and Core Web Vitals rankings.",
      "critical",
      "performance",
      {
        affectedFolders: slowFolders.map((f) => f.folder),
        score: Math.min(...slowFolders.map((f) => f.averageScore.performance)),
      }
    );
  }

  if (mediumFolders.length > 0) {
    add(
      "Performance needs improvement",
      `Pages in ${mediumFolders.map((f) => f.label).join(", ")} scored between 50–89. ` +
        "Consider lazy-loading images below the fold, minimizing JavaScript bundle size, and using a CDN.",
      "Medium — improvements here boost ranking signals and user experience.",
      "warning",
      "performance",
      { affectedFolders: mediumFolders.map((f) => f.folder) }
    );
  }

  // ── Core Web Vitals ────────────────────────────────────────────────────────

  const allPageScores = folders.flatMap((f) => f.scores);

  const highLcpPages = allPageScores.filter(
    (s) => s.lcp != null && s.lcp > 4000
  );
  if (highLcpPages.length > 0) {
    const avgLcp = Math.round(
      highLcpPages.reduce((sum, s) => sum + (s.lcp ?? 0), 0) / highLcpPages.length
    );
    add(
      "Large Contentful Paint (LCP) exceeds 4s",
      `${highLcpPages.length} page${highLcpPages.length > 1 ? "s" : ""} have LCP above 4 seconds ` +
        `(avg ${(avgLcp / 1000).toFixed(1)}s). Optimize hero images, use preload hints for critical assets, ` +
        "and consider SSR or static generation.",
      "High — LCP is a Core Web Vital used directly in Google Search ranking.",
      "critical",
      "performance",
      { savingsMs: Math.max(0, avgLcp - 2500) }
    );
  }

  const highClsPages = allPageScores.filter(
    (s) => s.cls != null && s.cls > 0.25
  );
  if (highClsPages.length > 0) {
    add(
      "Cumulative Layout Shift (CLS) is too high",
      `${highClsPages.length} page${highClsPages.length > 1 ? "s" : ""} have CLS above 0.25. ` +
        "Reserve space for dynamic content, specify width/height on images, " +
        "and avoid inserting content above existing content.",
      "High — CLS is a Core Web Vital and key UX metric.",
      "critical",
      "performance"
    );
  }

  const highTbtPages = allPageScores.filter(
    (s) => s.tbt != null && s.tbt > 600
  );
  if (highTbtPages.length > 0) {
    const avgTbt = Math.round(
      highTbtPages.reduce((sum, s) => sum + (s.tbt ?? 0), 0) / highTbtPages.length
    );
    add(
      "Total Blocking Time (TBT) is high",
      `${highTbtPages.length} page${highTbtPages.length > 1 ? "s" : ""} have TBT above 600ms. ` +
        "Break up long tasks, defer non-critical JS, and use Web Workers for heavy computation.",
      "Medium — high TBT causes input latency and a sluggish feel.",
      "warning",
      "performance",
      { savingsMs: Math.max(0, avgTbt - 200) }
    );
  }

  const highTtfbPages = allPageScores.filter(
    (s) => s.ttfb != null && s.ttfb > 1800
  );
  if (highTtfbPages.length > 0) {
    add(
      "Server Response Time (TTFB) is too slow",
      `${highTtfbPages.length} page${highTtfbPages.length > 1 ? "s" : ""} have TTFB above 1.8s. ` +
        "Consider enabling caching, using a CDN edge network, and optimizing database queries.",
      "High — slow TTFB delays every downstream metric.",
      "critical",
      "performance"
    );
  }

  // ── Top Lighthouse Issues (savings-driven) ─────────────────────────────────

  const topOpportunities = topIssues.filter((i) => i.avgSavingsMs > 200).slice(0, 3);
  for (const opp of topOpportunities) {
    const savings = opp.avgSavingsMs >= 1000
      ? `${(opp.avgSavingsMs / 1000).toFixed(1)}s`
      : `${opp.avgSavingsMs}ms`;
    add(
      opp.title.replace(/\b\w/g, (c) => c.toUpperCase()),
      `Found on ${opp.occurrences} page${opp.occurrences > 1 ? "s" : ""}. ` +
        `Potential savings: ~${savings} per page.`,
      `${opp.occurrences} pages affected — fixing this would save ~${savings} per visit.`,
      opp.avgSavingsMs > 1000 ? "critical" : "warning",
      "performance",
      { savingsMs: opp.avgSavingsMs }
    );
  }

  // ── Accessibility ──────────────────────────────────────────────────────────

  const lowA11yFolders = folders.filter(
    (f) => f.averageScore.accessibility < SCORE_THRESHOLDS.good
  );
  if (lowA11yFolders.length > 0) {
    add(
      "Accessibility improvements needed",
      `Pages in ${lowA11yFolders.map((f) => f.label).join(", ")} scored below 90. ` +
        "Ensure images have alt text, form fields have labels, color contrast meets WCAG AA, " +
        "and interactive elements are keyboard navigable.",
      "Medium — accessibility issues impact assistive tech users and carry legal risk.",
      "warning",
      "accessibility",
      { affectedFolders: lowA11yFolders.map((f) => f.folder) }
    );
  }

  // ── SEO ────────────────────────────────────────────────────────────────────

  const lowSeoFolders = folders.filter(
    (f) => f.averageScore.seo < SCORE_THRESHOLDS.good
  );
  if (lowSeoFolders.length > 0) {
    add(
      "SEO issues detected",
      `Pages in ${lowSeoFolders.map((f) => f.label).join(", ")} scored below 90 for SEO. ` +
        "Add meta descriptions, ensure pages are crawlable, fix broken links, and add structured data.",
      "High — SEO issues directly limit organic search visibility.",
      "critical",
      "seo",
      { affectedFolders: lowSeoFolders.map((f) => f.folder) }
    );
  }

  // ── Best Practices ─────────────────────────────────────────────────────────

  const lowBpFolders = folders.filter(
    (f) => f.averageScore.bestPractices < SCORE_THRESHOLDS.good
  );
  if (lowBpFolders.length > 0) {
    add(
      "Best practices not followed",
      `Pages in ${lowBpFolders.map((f) => f.label).join(", ")} have best-practice issues. ` +
        "Check for mixed content, deprecated APIs, and console errors.",
      "Low — may cause security warnings or degrade trust signals.",
      "info",
      "best-practices",
      { affectedFolders: lowBpFolders.map((f) => f.folder) }
    );
  }

  // ── Homepage Priority ──────────────────────────────────────────────────────

  if (homepageScore && homepageScore.performance < SCORE_THRESHOLDS.good) {
    add(
      "Homepage performance needs priority attention",
      "The homepage is your most crawled and most-visited page. Performance issues here have maximum impact on SEO and first impressions.",
      "Critical — the homepage sets the tone for the entire site.",
      "critical",
      "performance",
      { affectedFolders: ["/"], score: homepageScore.performance }
    );
  }

  // ── GA4 / GSC Integration ──────────────────────────────────────────────────

  add(
    "Connect GA4 and Google Search Console for real-user data",
    "Integrate GA4 (CrUX field data) and GSC (CTR by section) to complement lab-based PSI scores. Real-user data carries more weight in CWV ranking signals.",
    "High — lab data alone misses real-device performance patterns.",
    "info",
    "general"
  );

  return recs;
}

// ─── Main Analysis Runner ─────────────────────────────────────────────────────

export async function runFullAnalysis(input: AnalysisInput): Promise<SiteReport> {
  const {
    siteUrl,
    urls,
    strategy,
    apiKey,
    onProgress,
    skippedReasons = [],
    truncated = false,
    totalRaw,
  } = input;

  const startedAt = Date.now();
  const origin = new URL(siteUrl).origin;
  const homepageUrl = origin + "/";

  // Build folder map with improved grouping
  const folderMap = groupUrlsByFolder(urls);

  // Always include homepage
  if (!folderMap.has("/")) {
    folderMap.set("/", [homepageUrl]);
  }

  // Enforce MAX_GROUPS limit
  let groupsTruncated = false;
  if (folderMap.size > MAX_GROUPS) {
    console.warn(
      `[report] Truncating ${folderMap.size} groups to MAX_GROUPS=${MAX_GROUPS}`
    );
    // Keep homepage + highest-URL-count groups
    const sorted = [...folderMap.entries()].sort(([a], [b]) => {
      if (a === "/") return -1;
      if (b === "/") return 1;
      return (folderMap.get(b)?.length ?? 0) - (folderMap.get(a)?.length ?? 0);
    });
    const kept = sorted.slice(0, MAX_GROUPS);
    folderMap.clear();
    for (const [k, v] of kept) folderMap.set(k, v);
    groupsTruncated = true;
  }

  // Build per-folder sample lists (important pages first)
  const toAnalyze: Array<{ folder: string; urls: string[]; allUrls: string[] }> = [];

  for (const [folder, folderUrls] of folderMap.entries()) {
    const prioritized = prioritizeImportantPages(
      folder === "/"
        ? [homepageUrl, ...folderUrls.filter((u) => normalizeUrlLocal(u) !== normalizeUrlLocal(homepageUrl))]
        : folderUrls
    );
    const samples = sampleArray(prioritized, MAX_PAGES_PER_GROUP).slice(0, MAX_PAGES_PER_GROUP);
    toAnalyze.push({ folder, urls: samples, allUrls: folderUrls });
  }

  const totalRequests = toAnalyze.reduce((sum, f) => sum + f.urls.length, 0);
  let completedRequests = 0;
  let cacheHits = 0;

  // ── Concurrent PSI requests with p-limit ───────────────────────────────────
  const limit = pLimit(PSI_CONCURRENCY);
  const folderReports: FolderReport[] = [];
  let homepageScore: PageScore | undefined;

  // Build flat list of all (folder, url) pairs and run concurrently
  const tasks: Array<{ folder: string; url: string; allUrls: string[] }> = [];
  for (const { folder, urls: sampleUrls, allUrls } of toAnalyze) {
    for (const url of sampleUrls) {
      tasks.push({ folder, url, allUrls });
    }
  }

  // Group results back by folder after concurrent run
  const scoresByFolder = new Map<string, PageScore[]>();

  await Promise.all(
    tasks.map(({ folder, url }) =>
      limit(async () => {
        onProgress?.(completedRequests, totalRequests, url);

        const score = await analyzePageWithPsi(url, strategy, apiKey);

        if (score.fromCache) cacheHits++;
        if ((folder === "/" || normalizeUrlLocal(url) === normalizeUrlLocal(homepageUrl)) && !homepageScore) {
          homepageScore = score;
        }

        const existing = scoresByFolder.get(folder) ?? [];
        existing.push(score);
        scoresByFolder.set(folder, existing);

        completedRequests++;
        onProgress?.(completedRequests, totalRequests, url);
      })
    )
  );

  // Assemble folder reports
  for (const { folder, urls: sampleUrls, allUrls } of toAnalyze) {
    const scores = scoresByFolder.get(folder) ?? [];
    const allFailed = scores.length > 0 && scores.every((s) => !!s.error);
    const avg = averageScores(scores);
    const grade: PerformanceGrade = allFailed ? "D" : categoryScoresToGrade(avg);

    folderReports.push({
      folder,
      label: getFolderLabel(folder),
      sampleUrls,
      scores,
      averageScore: avg,
      grade,
      pageCount: allUrls.length,
      isImportant: sampleUrls.some(isImportantPage) || folder === "/",
      allFailed,
    });
  }

  // Sort: homepage first, then by overall score ascending (worst first for attention)
  folderReports.sort((a, b) => {
    if (a.folder === "/") return -1;
    if (b.folder === "/") return 1;
    return computeOverall(a.averageScore) - computeOverall(b.averageScore);
  });

  const allPageScores = folderReports.flatMap((f) => f.scores).filter((s) => !s.error);
  const overall = averageScores(allPageScores);
  const topIssues = aggregateTopIssues(allPageScores);
  const recommendations = buildRecommendations(folderReports, topIssues, homepageScore);
  const durationMs = Date.now() - startedAt;

  // Build important pages found list
  const importantPagesFound = allPageScores
    .filter((s) => isImportantPage(s.url))
    .map((s) => s.url);

  // Collect per-page errors for metadata
  const allRawScores = folderReports.flatMap((f) => f.scores);
  const psiErrors: PsiPageError[] = allRawScores
    .filter((s) => !!s.error)
    .map((s) => ({
      url: s.url,
      error: s.error!,
      ...classifyPsiError(s.error!),
    }));

  const metadata: ReportMetadata = {
    totalUrlsDiscovered: totalRaw ?? urls.length,
    totalUrlsAnalyzed: completedRequests,
    successfulPages: allRawScores.filter((s) => !s.error).length,
    failedPages: psiErrors.length,
    psiErrors: psiErrors.slice(0, 20), // cap payload
    skippedUrls: skippedReasons.length,
    skippedReasons: skippedReasons.slice(0, 50),
    strategy,
    generatedAt: new Date().toISOString(),
    durationMs,
    truncated: truncated || groupsTruncated,
    importantPagesFound,
    cacheHits,
    hasApiKey: !!(apiKey || process.env.PSI_API_KEY),
  };

  return {
    siteUrl,
    strategy,
    analyzedAt: new Date().toISOString(),
    totalUrlsCrawled: urls.length,
    totalUrlsAnalyzed: completedRequests,
    homepageScore,
    folders: folderReports,
    recommendations,
    topIssues,
    overallScore: computeOverall(overall),
    metadata,
  };
}

// Local URL normalizer to avoid circular import with lib/url-utils
function normalizeUrlLocal(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + (u.pathname.replace(/\/$/, "") || "/");
  } catch {
    return url;
  }
}
