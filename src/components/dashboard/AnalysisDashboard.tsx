"use client";

import { useEffect, useState } from "react";
import { SiteReport, ProgressEvent } from "@/types";
import { ProgressIndicator } from "./ProgressIndicator";
import { FolderScoreCard } from "./FolderScoreCard";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { SummaryStats } from "./SummaryStats";
import { WebVitalsCard } from "./WebVitalsCard";
import { TopIssuesPanel } from "./TopIssuesPanel";
import { GradeBadge } from "./GradeBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Download,
  RefreshCw,
  ArrowLeft,
  FileText,
  Smartphone,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { categoryScoresToGrade } from "@/lib/grading";
import { averageScores } from "@/services/psi.service";

interface AnalysisDashboardProps {
  jobId: string;
  isPrint?: boolean;
}

export function AnalysisDashboard({ jobId, isPrint }: AnalysisDashboardProps) {
  const [progress, setProgress] = useState<ProgressEvent>({
    jobId,
    status: "pending",
    progress: 0,
    currentStep: "Connecting…",
  });
  const [report, setReport] = useState<SiteReport | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      while (!stopped) {
        try {
          const res = await fetch(`/api/progress/${jobId}`);
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          const data = await res.json() as ProgressEvent & { error?: string };

          if (data.error) {
            setProgress((prev) => ({
              ...prev,
              status: "failed",
              currentStep: data.error ?? "Unknown error",
            }));
            return;
          }

          setProgress(data);

          if (data.status === "completed") {
            await fetchReport();
            return;
          }

          if (data.status === "failed") return;
        } catch {
          // network blip — keep polling
        }

        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    async function fetchReport() {
      try {
        const res = await fetch(`/api/report/${jobId}`);
        if (res.ok) {
          const data = await res.json() as SiteReport;
          setReport(data);
        }
      } catch {
        // ignore
      }
    }

    void poll();
    return () => { stopped = true; };
  }, [jobId]);

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/pdf/${jobId}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `site-analysis-${jobId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function downloadCsv() {
    setDownloadingCsv(true);
    try {
      const res = await fetch(`/api/csv/${jobId}`);
      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `site-analysis-${jobId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "CSV download failed");
    } finally {
      setDownloadingCsv(false);
    }
  }

  // ── Print / PDF mode ─────────────────────────────────────────────────────────
  // Fully linearised layout — no tabs, no buttons, clean page breaks.
  if (isPrint && report) {
    const allScores = report.folders.flatMap((f) => f.scores).filter((s) => !s.error);
    const avg = averageScores(allScores);
    const grade = categoryScoresToGrade(avg);

    return (
      <div className="print-report bg-white" data-report-ready>
        {/* Cover / header */}
        <div className="mb-8 pb-6 border-b">
          <h1 className="text-2xl font-bold mb-1">Site Performance Report</h1>
          <p className="text-muted-foreground text-sm">{report.siteUrl}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            <span>Generated: {new Date(report.analyzedAt).toLocaleString()}</span>
            <span>·</span>
            <span>Strategy: {report.strategy}</span>
            <span>·</span>
            <span>{report.totalUrlsAnalyzed} pages analyzed</span>
            <span>·</span>
            <span>Overall grade: <strong>{grade}</strong> ({report.overallScore}/100)</span>
          </div>
        </div>

        {/* Homepage screenshot if available */}
        {report.homepageScreenshotBase64 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Homepage Preview</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.homepageScreenshotBase64}
              alt="Homepage screenshot"
              className="w-full rounded-lg border"
              style={{ maxHeight: "400px", objectFit: "cover", objectPosition: "top" }}
            />
          </div>
        )}

        <SummaryStats report={report} />

        {report.homepageScore && (
          <div className="mt-6">
            <WebVitalsCard score={report.homepageScore} title="Homepage Core Web Vitals" />
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Section Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.folders.map((folder) => (
              <FolderScoreCard key={folder.folder} folder={folder} isPrint totalFolders={report.folders.length} />
            ))}
          </div>
        </div>

        {report.topIssues.length > 0 && (
          <div className="mt-8">
            <TopIssuesPanel issues={report.topIssues} />
          </div>
        )}

        <div className="mt-8">
          <RecommendationsPanel recommendations={report.recommendations} />
        </div>
      </div>
    );
  }

  // ── Loading / Error state ─────────────────────────────────────────────────────

  if (!report) {
    if (progress.status === "failed") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-semibold">Analysis failed</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {progress.currentStep}
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ProgressIndicator event={progress} />
      </div>
    );
  }

  // ── Full interactive dashboard ────────────────────────────────────────────────

  const allScores = report.folders.flatMap((f) => f.scores).filter((s) => !s.error);
  const avg = averageScores(allScores);
  const overallGrade = categoryScoresToGrade(avg);
  const isMobile = report.strategy === "mobile";

  return (
    <div className="space-y-6" data-report-ready>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-bold truncate max-w-[380px]">
              {report.siteUrl}
            </h1>
            <GradeBadge grade={overallGrade} size="sm" />
          </div>
          <div className="flex items-center gap-2 pl-6">
            <p className="text-xs text-muted-foreground">
              {report.folders.length} sections · {report.totalUrlsAnalyzed} pages ·{" "}
              {new Date(report.analyzedAt).toLocaleString()}
            </p>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              {isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
              {isMobile ? "Mobile" : "Desktop"}
            </Badge>
            {report.metadata?.truncated && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Truncated
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Link href="/">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              New analysis
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={downloadingCsv}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            {downloadingCsv ? "Exporting…" : "CSV"}
          </Button>
          <Button onClick={downloadPdf} disabled={downloadingPdf} size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloadingPdf ? "Generating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">
            Pages
            <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
              {report.folders.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="top-issues">
            Top Issues
            {report.topIssues.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {report.topIssues.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
            <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
              {report.recommendations.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <SummaryStats report={report} />
          {report.homepageScore && (
            <WebVitalsCard score={report.homepageScore} title="Homepage Core Web Vitals" />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {report.folders.slice(0, 6).map((folder) => (
              <FolderScoreCard key={folder.folder} folder={folder} totalFolders={report.folders.length} />
            ))}
          </div>
          {report.folders.length > 6 && (
            <p className="text-sm text-muted-foreground text-center">
              +{report.folders.length - 6} more pages — see the Pages tab
            </p>
          )}
        </TabsContent>

        {/* All pages */}
        <TabsContent value="sections" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {report.folders.map((folder) => (
              <FolderScoreCard key={folder.folder} folder={folder} totalFolders={report.folders.length} />
            ))}
          </div>
        </TabsContent>

        {/* Top issues */}
        <TabsContent value="top-issues" className="pt-4">
          <TopIssuesPanel issues={report.topIssues} />
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="pt-4">
          <RecommendationsPanel recommendations={report.recommendations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
