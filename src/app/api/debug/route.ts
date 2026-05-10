import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const envCheck = {
    UPSTASH_REDIS_REST_URL: url ? `set (${url.slice(0, 30)}...)` : "MISSING",
    UPSTASH_REDIS_REST_TOKEN: token ? `set (${token.slice(0, 10)}...)` : "MISSING",
    PSI_API_KEY: process.env.PSI_API_KEY ? "set" : "MISSING",
  };

  let redisTest: string;
  try {
    if (!url || !token) throw new Error("Env vars missing");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    await redis.set("debug-ping", "pong", { ex: 60 });
    const val = await redis.get("debug-ping");
    redisTest = val === "pong" ? "OK" : `Unexpected value: ${val}`;
  } catch (err) {
    redisTest = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ envCheck, redisTest });
}
