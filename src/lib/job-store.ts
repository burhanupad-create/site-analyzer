import { Redis } from "@upstash/redis";
import type { AnalysisJob, JobStatus, PsiStrategy, SiteReport } from "@/types";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = 60 * 60 * 2; // 2 hours

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createJob(url: string, strategy: PsiStrategy = "mobile"): Promise<AnalysisJob> {
  const id = crypto.randomUUID();
  const job: AnalysisJob = {
    id,
    url,
    strategy,
    status: "pending",
    progress: 0,
    currentStep: "Queued",
    startedAt: new Date(),
  };
  await redis.set(`job:${id}`, JSON.stringify(job), { ex: TTL });
  return job;
}

export async function getJob(id: string): Promise<AnalysisJob | undefined> {
  const data = await redis.get<string>(`job:${id}`);
  if (!data) return undefined;
  const job = typeof data === "string" ? JSON.parse(data) : data;
  job.startedAt = new Date(job.startedAt);
  if (job.completedAt) job.completedAt = new Date(job.completedAt);
  return job;
}

export async function updateJob(
  id: string,
  updates: Partial<Omit<AnalysisJob, "id">>
): Promise<AnalysisJob | undefined> {
  const job = await getJob(id);
  if (!job) return undefined;
  const updated = { ...job, ...updates };
  await redis.set(`job:${id}`, JSON.stringify(updated), { ex: TTL });
  return updated;
}

// ─── Convenience Setters ──────────────────────────────────────────────────────

export async function setJobRunning(id: string, step: string, progress: number): Promise<void> {
  await updateJob(id, { status: "running", currentStep: step, progress });
}

export async function setJobCompleted(id: string, report: SiteReport): Promise<void> {
  await updateJob(id, {
    status: "completed",
    progress: 100,
    currentStep: "Analysis complete",
    completedAt: new Date(),
    report,
  });
}

export async function setJobFailed(id: string, error: string): Promise<void> {
  await updateJob(id, {
    status: "failed",
    currentStep: "Failed",
    error,
    completedAt: new Date(),
  });
}

export async function getJobSnapshot(id: string): Promise<Omit<AnalysisJob, "report"> | AnalysisJob | undefined> {
  return getJob(id);
}

export type { JobStatus };
