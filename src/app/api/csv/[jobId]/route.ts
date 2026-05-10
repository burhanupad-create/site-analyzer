import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";
import type { PageScore } from "@/types";

// ─── CSV Helpers ──────────────────────────────────────────────────────────────

/** Escapes a value for RFC 4180 CSV: wraps in quotes, doubles internal quotes */
function csvCell(value: string | number | undefined | null): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | undefined | null)[]): string {
  return cells.map(csvCell).join(",");
}

function buildCsv(scores: PageScore[]): string {
  const header = csvRow([
    "URL",
    "Performance",
    "Accessibility",
    "Best Practices",
    "SEO",
    "LCP (ms)",
    "CLS",
    "TBT (ms)",
    "FCP (ms)",
    "TTFB (ms)",
    "Speed Index (ms)",
    "Error",
    "From Cache",
  ]);

  const rows = scores.map((s) =>
    csvRow([
      s.url,
      s.performance,
      s.accessibility,
      s.bestPractices,
      s.seo,
      s.lcp,
      s.cls,
      s.tbt,
      s.fcp,
      s.ttfb,
      s.si,
      s.error ?? "",
      s.fromCache ? "yes" : "no",
    ])
  );

  // UTF-8 BOM ensures Excel opens the file correctly with accented characters
  return "﻿" + [header, ...rows].join("\r\n");
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job || job.status !== "completed" || !job.report) {
    return NextResponse.json(
      { error: "Report not ready or not found" },
      { status: 404 }
    );
  }

  const allScores = job.report.folders.flatMap((f) => f.scores);
  const csv = buildCsv(allScores);

  const filename = `site-analysis-${job.report.siteUrl.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${jobId.slice(0, 8)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
