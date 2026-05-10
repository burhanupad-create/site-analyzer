"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe, Loader2, ChevronDown, ChevronUp, KeyRound, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PsiStrategy } from "@/types";

export function UrlInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [strategy, setStrategy] = useState<PsiStrategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          apiKey: apiKey.trim() || undefined,
          strategy,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Failed to start analysis");
      }

      const { jobId } = await res.json() as { jobId: string };
      router.push(`/analysis/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
      {/* URL input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className={cn(
              "w-full pl-10 pr-4 py-3 rounded-lg border bg-background text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "placeholder:text-muted-foreground transition-colors",
              error && "border-red-400 focus:ring-red-300"
            )}
            disabled={loading}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading || !url.trim()} size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting…
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </div>

      {/* Strategy selector */}
      <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setStrategy("mobile")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            strategy === "mobile"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Mobile
        </button>
        <button
          type="button"
          onClick={() => setStrategy("desktop")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            strategy === "desktop"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="h-3.5 w-3.5" />
          Desktop
        </button>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <KeyRound className="h-3 w-3" />
        PSI API Key (optional — avoids rate limits)
        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {showAdvanced && (
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIza…"
          className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono placeholder:text-muted-foreground"
          disabled={loading}
        />
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
