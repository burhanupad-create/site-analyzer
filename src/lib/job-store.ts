import type { AnalysisJob, JobStatus, PsiStrategy, SkipReason, SiteReport } from "@/types";
import crypto from "crypto";

const TTL = 60 * 60 * 2; // 2 hours in seconds

// ─── Redis client (lazy — only created when env vars are present) ─────────────

let redisClient: import("@upstash/redis").Redis | null = null;

async function getRedis(): Promise<import("@upstash/redis").Redis | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[job-store] Redis env vars missing — using in-memory store");
    return null;
  }

  if (!redisClient) {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

const memStore = new Map<string, AnalysisJob>();

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

  const redis = await getRedis();
  if (redis) {
    await redis.set(`job:${id}`, JSON.stringify(job), { ex: TTL });
  } else {
    memStore.set(id, job);
  }
  return job;
}

export async function getJob(id: string): Promise<AnalysisJob | undefined> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get<string>(`job:${id}`);
    if (!data) return undefined;
    const job = typeof data === "string" ? JSON.parse(data) : data;
    job.startedAt = new Date(job.startedAt);
    if (job.completedAt) job.completedAt = new Date(job.completedAt);
    return job;
  }
  return memStore.get(id);
}

export async function updateJob(
  id: string,
  updates: Partial<Omit<AnalysisJob, "id">>
): Promise<AnalysisJob | undefined> {
  const job = await getJob(id);
  if (!job) return undefined;
  const updated = { ...job, ...updates };

  const redis = await getRedis();
  if (redis) {
    await redis.set(`job:${id}`, JSON.stringify(updated), { ex: TTL });
  } else {
    memStore.set(id, updated);
  }
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


export async function setJobSelecting(
  id: string,
  opts: {
    discoveredUrls: string[];
    skippedReasons: SkipReason[];
    truncated: boolean;
    totalRaw: number;
    sitemapUrl: string;
    apiKey?: string;
  }
): Promise<void> {
  await updateJob(id, {
    status: "selecting",
    currentStep: `Found ${opts.discoveredUrls.length} pages — select which to analyze`,
    ...opts,
  });
}

export async function getJobSnapshot(id: string): Promise<Omit<AnalysisJob, "report"> | AnalysisJob | undefined> {
  return getJob(id);
}

export type { JobStatus };
