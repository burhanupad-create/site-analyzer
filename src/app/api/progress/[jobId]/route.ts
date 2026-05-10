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
      let attempts = 0;
      const maxAttempts = 180; // 3 minutes max (1s interval)

      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const poll = async () => {
        const job = await getJob(jobId);

        if (!job) {
          send({ error: "Job not found" });
          controller.close();
          return;
        }

        send({
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          currentStep: job.currentStep,
          error: job.error,
        });

        if (job.status === "completed" || job.status === "failed") {
          controller.close();
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          send({ error: "Polling timeout" });
          controller.close();
          return;
        }

        await new Promise((r) => setTimeout(r, 1000));
        await poll();
      };

      await poll();
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
