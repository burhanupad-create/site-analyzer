import { NextRequest } from "next/server";
import { getJob } from "@/lib/job-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Server-Sent Events endpoint for real-time job progress
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const maxSeconds = 600; // 10 minutes
      const intervalMs = 1500;
      const maxAttempts = Math.ceil((maxSeconds * 1000) / intervalMs);

      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const job = await getJob(jobId);

        if (!job) {
          send({ error: "Job not found" });
          break;
        }

        // Skip sending "selecting" status — wait silently until running starts
        if (job.status !== "selecting") {
          send({
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            currentStep: job.currentStep,
            error: job.error,
          });
        }

        if (job.status === "completed" || job.status === "failed") break;

        await new Promise((r) => setTimeout(r, intervalMs));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
