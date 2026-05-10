import { NextRequest, NextResponse } from "next/server";
import { analyzePageWithPsi, classifyPsiError } from "@/services/psi.service";
import type { PsiStrategy } from "@/types";

// Debug route: GET /api/test-psi?url=https://web.dev&strategy=mobile
// Calls PSI directly and returns the raw parsed result — useful for isolating
// whether the issue is in parsing, the API key, or the dashboard rendering.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const strategy = (searchParams.get("strategy") ?? "mobile") as PsiStrategy;
  const apiKey = searchParams.get("apiKey") ?? process.env.PSI_API_KEY;

  if (!url) {
    return NextResponse.json({ error: "url query param is required. Example: /api/test-psi?url=https://web.dev" }, { status: 400 });
  }

  const start = Date.now();
  const result = await analyzePageWithPsi(url, strategy, apiKey ?? undefined);
  const durationMs = Date.now() - start;

  const errorInfo = result.error ? classifyPsiError(result.error) : null;

  return NextResponse.json({
    url,
    strategy,
    durationMs,
    hasApiKey: !!apiKey,
    result,
    errorInfo,
    env: {
      PSI_API_KEY_SET: !!process.env.PSI_API_KEY,
      DEBUG_PSI: process.env.DEBUG_PSI,
    },
  });
}
