import { NextRequest, NextResponse } from "next/server";
import { createJob, setJobFailed, setJobSelecting } from "@/lib/job-store";
import { discoverAndCrawlSitemap } from "@/services/sitemap.service";
import { checkRateLimit, ANALYSIS_RATE_LIMIT } from "@/lib/rate-limit";
import type { PsiStrategy } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    return await handleAnalyze(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[analyze] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleAnalyze(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { allowed } = await checkRateLimit(ip, ANALYSIS_RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many analysis requests. Please wait before trying again." },
      { status: 429 }
    );
  }

  const body = await req.json() as {
    url?: string;
    apiKey?: string;
    strategy?: string;
  };

  const { url, apiKey } = body;
  const strategy: PsiStrategy =
    body.strategy === "desktop" ? "desktop" : "mobile";

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (isPrivateUrl(parsedUrl)) {
    return NextResponse.json(
      { error: "URL must be a publicly accessible website (localhost and private IPs are not supported)" },
      { status: 400 }
    );
  }

  if (!process.env.PSI_API_KEY && !apiKey) {
    console.warn("[analyze] No PSI_API_KEY set — using anonymous quota.");
  }

  const job = await createJob(parsedUrl.href, strategy);

  try {
    const crawlResult = await discoverAndCrawlSitemap(parsedUrl.href);
    await setJobSelecting(job.id, {
      discoveredUrls: crawlResult.urls,
      skippedReasons: crawlResult.skippedReasons,
      truncated: crawlResult.truncated,
      totalRaw: crawlResult.totalRaw,
      sitemapUrl: crawlResult.sitemapUrl,
      apiKey: apiKey || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setJobFailed(job.id, message);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  return NextResponse.json({ jobId: job.id }, { status: 200 });
}

// ─── Private URL Guard ────────────────────────────────────────────────────────

function isPrivateUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}
