"use client";

import { SiteReport } from "@/types";
import { ScoreBadge } from "./ScoreBadge";
import { ScoreBar } from "./ScoreBar";
import { GradeBadge } from "./GradeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Clock,
  FileText,
  Layers,
  Smartphone,
  Monitor,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { averageScores } from "@/services/psi.service";
import { categoryScoresToGrade } from "@/lib/grading";
import { cn } from "@/lib/utils";

interface SummaryStatsProps {
  report: SiteReport;
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function SummaryStats({ report }: SummaryStatsProps) {
  const allScores = report.folders.flatMap((f) => f.scores).filter((s) => !s.error);
  const avg = averageScores(allScores);
  const grade = categoryScoresToGrade(avg);
  const { metadata } = report;
  const hasQuotaErrors = metadata?.psiErrors?.some((e) => e.isQuotaError) ?? false;
  const failedPages = metadata?.failedPages ?? 0;
  const hasApiKey = metadata?.hasApiKey ?? true;

  const analyzedAt = new Date(report.analyzedAt).toLocaleString();
  const isMobile = report.strategy === "mobile";

  return (
    <div className="space-y-4">
    {/* PSI failure / quota warning banner */}
    {(hasQuotaErrors || (!hasApiKey && failedPages > 0)) && (
      <div className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        "bg-red-500/10 border-red-500/25 text-red-400"
      )}>
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            {hasQuotaErrors
              ? "API quota exceeded — scores may be missing"
              : `${failedPages} page${failedPages !== 1 ? "s" : ""} failed to analyze`}
          </p>
          <p className="text-red-400/80 text-xs">
            {hasQuotaErrors
              ? "The Google PageSpeed Insights API returned rate-limit errors. The anonymous quota is ~2 requests/min. Add a "
              : "Some pages could not be analyzed. Adding a "}
            <a
              href="https://developers.google.com/speed/docs/insights/v5/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              PSI API key
            </a>
            {" to your "}
            <code className="font-mono bg-red-500/15 px-1 rounded">.env.local</code>
            {" raises the limit to ~240 req/min."}
          </p>
        </div>
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Overall score card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Overall Site Score
            </CardTitle>
            {/* Strategy badge */}
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              {isMobile ? (
                <Smartphone className="h-3 w-3" />
              ) : (
                <Monitor className="h-3 w-3" />
              )}
              {isMobile ? "Mobile" : "Desktop"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <ScoreBadge score={report.overallScore} size="lg" showLabel />
              <GradeBadge grade={grade} size="sm" showLabel />
            </div>
            <div className="flex-1 space-y-2">
              <ScoreBar label="Performance" score={avg.performance} />
              <ScoreBar label="Accessibility" score={avg.accessibility} />
              <ScoreBar label="Best Practices" score={avg.bestPractices} />
              <ScoreBar label="SEO" score={avg.seo} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                URLs in sitemap
              </dt>
              <dd className="font-semibold tabular-nums">
                {metadata?.totalUrlsDiscovered ?? report.totalUrlsCrawled}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Pages analyzed
              </dt>
              <dd className="font-semibold tabular-nums">{report.totalUrlsAnalyzed}</dd>
            </div>
            {metadata?.skippedUrls != null && metadata.skippedUrls > 0 && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Skipped URLs
                </dt>
                <dd className="font-semibold tabular-nums text-amber-500">
                  {metadata.skippedUrls}
                </dd>
              </div>
            )}
            {metadata?.cacheHits != null && metadata.cacheHits > 0 && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Cache hits
                </dt>
                <dd className="font-semibold tabular-nums text-emerald-600">
                  {metadata.cacheHits}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Duration
              </dt>
              <dd className="font-medium tabular-nums">
                {metadata?.durationMs ? formatDuration(metadata.durationMs) : "—"}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Recommendations</dt>
              <dd className="font-semibold tabular-nums">{report.recommendations.length}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Analyzed at</dt>
              <dd className="font-medium text-right text-xs">{analyzedAt}</dd>
            </div>
          </dl>

          {/* Truncation warning */}
          {metadata?.truncated && (
            <div className={cn(
              "mt-3 flex items-start gap-2 text-xs p-2.5 rounded-lg",
              "bg-amber-500/10 border border-amber-500/25 text-amber-400"
            )}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Sitemap was large — analysis was limited to the first{" "}
                {report.totalUrlsCrawled} URLs to stay within API quotas.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
