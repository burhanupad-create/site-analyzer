import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";
import { generatePdfReport } from "@/services/pdf.service";

export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job || job.status !== "completed" || !job.report) {
    return NextResponse.json(
      { error: "Report not ready or not found" },
      { status: 404 }
    );
  }

  try {
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const pdfBuffer = await generatePdfReport(jobId, baseUrl);

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="site-analysis-${jobId.slice(0, 8)}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
