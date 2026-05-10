/**
 * In-memory job store.
 *
 * Production upgrade path:
 *   Replace the Map with a Redis/Upstash adapter — the public interface
 *   (createJob, getJob, updateJob, setJobRunning, setJobCompleted, setJobFailed)
 *   stays identical so no callers need changing.
 *
 * For persistent history (PostgreSQL):
 *   Wrap the same interface with a DB adapter and upsert on each updateJob call.
 */

import type { AnalysisJob, JobStatus, PsiStrategy, SiteReport } from "@/types";
import crypto from "crypto";

const jobs = new Map<string, AnalysisJob>();

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createJob(url: string, strategy: PsiStrategy = "mobile"): AnalysisJob {
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
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): AnalysisJob | undefined {
  return jobs.get(id);
}

export function updateJob(
  id: string,
  updates: Partial<Omit<AnalysisJob, "id">>
): AnalysisJob | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  const updated = { ...job, ...updates };
  jobs.set(id, updated);
  return updated;
}

// ─── Convenience Setters ──────────────────────────────────────────────────────

export function setJobRunning(id: string, step: string, progress: number): void {
  updateJob(id, { status: "running", currentStep: step, progress });
}

export function setJobCompleted(id: string, report: SiteReport): void {
  updateJob(id, {
    status: "completed",
    progress: 100,
    currentStep: "Analysis complete",
    completedAt: new Date(),
    report,
  });
}

export function setJobFailed(id: string, error: string): void {
  updateJob(id, {
    status: "failed",
    currentStep: "Failed",
    error,
    completedAt: new Date(),
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function listJobs(): AnalysisJob[] {
  return Array.from(jobs.values()).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
  );
}

/** Remove jobs older than 2 hours to prevent memory leaks */
export function pruneOldJobs(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1_000;
  for (const [id, job] of jobs.entries()) {
    if (job.startedAt.getTime() < cutoff) jobs.delete(id);
  }
}

/** Returns a serialisable snapshot — safe to send over SSE/JSON */
export function getJobSnapshot(id: string): Omit<AnalysisJob, "report"> | AnalysisJob | undefined {
  return jobs.get(id);
}

// Type-only re-export so API routes don't need to import types separately
export type { JobStatus };
