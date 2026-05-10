/**
 * PSI Response Cache
 *
 * Architecture: abstracted behind a CacheStore interface so the current
 * Map-based in-process implementation can be swapped for Redis/Upstash
 * without touching psi.service.ts.
 *
 * To upgrade to Redis:
 *   1. Implement CacheStore with ioredis or @upstash/redis
 *   2. Export an instance that uses the Redis adapter
 *   3. No changes needed in psi.service.ts
 */

import { PSI_CACHE_TTL_MS } from "./constants";
import type { PageScore, PsiStrategy } from "@/types";

// ─── Cache Abstraction ────────────────────────────────────────────────────────

export interface CacheStore<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// ─── In-Memory Implementation ─────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache<T> implements CacheStore<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  /** Expose size for diagnostics */
  get size(): number {
    return this.store.size;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const psiCache = new InMemoryCache<PageScore>();

// ─── Key Builder ──────────────────────────────────────────────────────────────

export function buildCacheKey(url: string, strategy: PsiStrategy): string {
  // Normalize the URL to avoid duplicates for http vs https, trailing slashes etc
  try {
    const u = new URL(url);
    const normalized = `${u.host}${u.pathname.replace(/\/$/, "") || "/"}`;
    return `psi:${strategy}:${normalized}`;
  } catch {
    return `psi:${strategy}:${url}`;
  }
}

// ─── Public Helpers ───────────────────────────────────────────────────────────

/** Returns the cached result and whether it was a hit */
export async function getCached(
  url: string,
  strategy: PsiStrategy
): Promise<{ hit: true; score: PageScore } | { hit: false }> {
  const key = buildCacheKey(url, strategy);
  const score = await psiCache.get(key);
  if (score) {
    console.log(`[psi-cache] HIT  ${key}`);
    return { hit: true, score: { ...score, fromCache: true } };
  }
  return { hit: false };
}

export async function setCached(
  url: string,
  strategy: PsiStrategy,
  score: PageScore
): Promise<void> {
  const key = buildCacheKey(url, strategy);
  await psiCache.set(key, score, PSI_CACHE_TTL_MS);
  console.log(`[psi-cache] SET  ${key}`);
}
