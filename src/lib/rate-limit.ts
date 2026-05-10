/**
 * Rate Limiting — Architecture Hooks
 *
 * Current state: in-process placeholder (always allows).
 * Production upgrade path:
 *   1. Install @upstash/ratelimit + @upstash/redis
 *   2. Replace InProcessRateLimiter with UpstashRateLimiter (same interface)
 *   3. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars
 *   4. No changes needed in the API routes — they call checkRateLimit()
 *
 * BullMQ / Inngest note:
 *   When moving to a proper job queue, the rate limiter here becomes the
 *   per-IP ingress gate, while the queue enforces PSI API quota upstream.
 */

import type { RateLimitConfig, RateLimitResult } from "@/types";

// ─── Abstraction ──────────────────────────────────────────────────────────────

export interface RateLimiter {
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

// ─── In-Process Implementation (placeholder) ──────────────────────────────────

interface WindowEntry {
  count: number;
  windowStart: number;
}

class InProcessRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, WindowEntry>();

  async check(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${identifier}:${config.identifier}`;
    const entry = this.windows.get(key);

    if (!entry || now - entry.windowStart > config.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.windowStart + config.windowMs,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.windowStart + config.windowMs,
    };
  }
}

// ─── Singleton + Config ───────────────────────────────────────────────────────

export const rateLimiter: RateLimiter = new InProcessRateLimiter();

/** Default rate limit: 10 analysis jobs per IP per hour */
export const ANALYSIS_RATE_LIMIT: RateLimitConfig = {
  identifier: "analyze",
  windowMs: 60 * 60 * 1_000,
  maxRequests: 10,
};

/**
 * Convenience wrapper for API routes.
 * Usage:
 *   const { allowed, remaining } = await checkRateLimit(req);
 *   if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */
export async function checkRateLimit(
  ip: string,
  config: RateLimitConfig = ANALYSIS_RATE_LIMIT
): Promise<RateLimitResult> {
  return rateLimiter.check(ip, config);
}
