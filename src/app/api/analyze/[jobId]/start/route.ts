import { NextRequest, NextResponse } from "next/server";
import {
  getJob,
  setJobCompleted,
  setJobFailed,
  setJobRunning,
  updateJob,
} from "@/lib/job-store";
import { runFullAnalysis } from "@/services/report.service";

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job || job.status !== "selecting") {
    return NextResponse.json(
      { error: "Job not found or not in selection state" },
      { status: 404 }
    );
  }

  const body = await req.json() as { selectedUrls?: string[] };
  const selectedUrls = body.selectedUrls ?? [];

  if (selectedUrls.length === 0) {
    return NextResponse.json({ error: "No pages selected" }, { status: 400 });
  }

  const { strategy, url: siteUrl, skippedReasons, truncated, totalRaw, apiKey } = job;

  // Clear the stored apiKey now that we've read it
  updateJob(jobId, { apiKey: undefined });

  // Fire-and-forget — works fine on localhost (long-running Node process)
  void runPsiInBackground({
    jobId,
    siteUrl,
    selectedUrls,
    strategy,
    apiKey: apiKey || process.env.PSI_API_KEY,
    skippedReasons: skippedReasons ?? [],
    truncated: truncated ?? false,
    totalRaw: totalRaw ?? selectedUrls.length,
  });

  return NextResponse.json({ jobId }, { status: 202 });
}

// ─── Background PSI Runner ────────────────────────────────────────────────────

async function runPsiInBackground(opts: {
  jobId: string;
  siteUrl: string;
  selectedUrls: string[];
  strategy: "mobile" | "desktop";
  apiKey?: string;
  skippedReasons: import("@/types").SkipReason[];
  truncated: boolean;
  totalRaw: number;
}): Promise<void> {
  const { jobId, siteUrl, selectedUrls, strategy, apiKey, skippedReasons, truncated, totalRaw } = opts;

  try {
    setJobRunning(jobId, `Starting analysis of ${selectedUrls.length} pages…`, 10);

    const report = await runFullAnalysis({
      siteUrl,
      urls: selectedUrls,
      strategy,
      apiKey,
      skippedReasons,
      truncated,
      totalRaw,
      onProgress: (completed, total, currentUrl) => {
        const psiProgress = total > 0 ? (completed / total) * 85 : 0;
        const progress = Math.min(95, 10 + Math.round(psiProgress));
        let pathname = currentUrl;
        try { pathname = new URL(currentUrl).pathname; } catch { /* ignore */ }
        setJobRunning(
          jobId,
          `Analyzing ${pathname} (${Math.min(completed + 1, total)}/${total})`,
          progress
        );
      },
    });

    setJobCompleted(jobId, report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[start] Job ${jobId} failed:`, message);
    setJobFailed(jobId, message);
  }
}
