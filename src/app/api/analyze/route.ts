import { NextRequest, NextResponse } from "next/server";
import {
  createJob,
  setJobCompleted,
  setJobFailed,
  setJobRunning,
} from "@/lib/job-store";
import { discoverAndCrawlSitemap } from "@/services/sitemap.service";
import { runFullAnalysis } from "@/services/report.service";
import { checkRateLimit, ANALYSIS_RATE_LIMIT } from "@/lib/rate-limit";
import type { PsiStrategy } from "@/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
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

  runJobInBackground(job.id, parsedUrl.href, strategy, apiKey);

  return NextResponse.json({ jobId: job.id }, { status: 202 });
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

// ─── Background Runner ────────────────────────────────────────────────────────

async function runJobInBackground(
  jobId: string,
  siteUrl: string,
  strategy: PsiStrategy,
  apiKey?: string
): Promise<void> {
  try {
    await setJobRunning(jobId, "Discovering sitemap…", 5);

    const crawlResult = await discoverAndCrawlSitemap(siteUrl);
    const { urls, sitemapUrl, truncated, totalRaw, skippedReasons } = crawlResult;

    const truncatedNote = truncated ? " (truncated to limit)" : "";
    await setJobRunning(
      jobId,
      `Found ${urls.length} URLs in sitemap (${sitemapUrl})${truncatedNote}`,
      15
    );

    const report = await runFullAnalysis({
      siteUrl,
      urls,
      strategy,
      apiKey: apiKey || process.env.PSI_API_KEY,
      skippedReasons,
      truncated,
      totalRaw,
      onProgress: async (completed, total, currentUrl) => {
        const psiProgress = total > 0 ? (completed / total) * 80 : 0;
        const progress = Math.min(95, 15 + Math.round(psiProgress));
        let pathname = currentUrl;
        try { pathname = new URL(currentUrl).pathname; } catch { /* ignore */ }
        await setJobRunning(jobId, `Analyzing ${pathname} (${completed + 1}/${total})`, progress);
      },
    });

    await setJobCompleted(jobId, report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[analyze] Job ${jobId} failed:`, message);
    await setJobFailed(jobId, message);
  }
}
