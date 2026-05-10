import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "failed") {
    return NextResponse.json({ error: job.error }, { status: 500 });
  }

  if (job.status !== "completed" || !job.report) {
    return NextResponse.json(
      { error: "Report not ready", status: job.status },
      { status: 202 }
    );
  }

  return NextResponse.json(job.report);
}
