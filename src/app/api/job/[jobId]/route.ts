import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    url: job.url,
    currentStep: job.currentStep,
    error: job.error,
    discoveredUrls: job.discoveredUrls ?? [],
    truncated: job.truncated ?? false,
    totalRaw: job.totalRaw ?? 0,
    sitemapUrl: job.sitemapUrl,
  });
}
