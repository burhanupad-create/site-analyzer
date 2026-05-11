"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisJob } from "@/types";
import { getFirstLevelFolder, getFolderLabel, isExcludedUrl } from "@/lib/url-utils";
import { Button } from "@/components/ui/button";
import { Globe, FolderOpen, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PagePickerProps {
  jobId: string;
  job: AnalysisJob;
}

interface FolderGroup {
  folder: string;
  label: string;
  urls: string[];
}

function groupByFolder(urls: string[]): FolderGroup[] {
  const map = new Map<string, string[]>();
  for (const url of urls) {
    const folder = getFirstLevelFolder(url);
    const list = map.get(folder) ?? [];
    list.push(url);
    map.set(folder, list);
  }
  // Homepage first, then alphabetical
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "/") return -1;
      if (b === "/") return 1;
      return a.localeCompare(b);
    })
    .map(([folder, urls]) => ({ folder, label: getFolderLabel(folder), urls }));
}

function getPathname(url: string): string {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

export function PagePicker({ jobId, job }: PagePickerProps) {
  const router = useRouter();
  const urls = job.discoveredUrls ?? [];
  const groups = groupByFolder(urls);

  // Pre-check every URL that isn't excluded by the filter rules
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const url of urls) {
      if (!isExcludedUrl(url)) s.add(url);
    }
    return s;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleUrl = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((folderUrls: string[]) => {
    setSelected((prev) => {
      const allSelected = folderUrls.every((u) => prev.has(u));
      const next = new Set(prev);
      if (allSelected) {
        folderUrls.forEach((u) => next.delete(u));
      } else {
        folderUrls.forEach((u) => next.add(u));
      }
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(urls));
  const selectNone = () => setSelected(new Set());

  async function handleStart() {
    if (selected.size === 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/analyze/${jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedUrls: [...selected] }),
      });

      let data: { error?: string } = {};
      try { data = await res.json() as { error?: string }; } catch { /* ignore */ }

      if (!res.ok) throw new Error(data.error ?? "Failed to start analysis");

      router.push(`/analysis/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  }

  if (urls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-semibold">No pages found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          The sitemap crawl didn&apos;t find any pages to analyze. Check that the site has a sitemap.xml.
        </p>
        <Link href="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Try another URL</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold">Select Pages to Analyze</h1>
        </div>
        <p className="text-sm text-muted-foreground pl-6">
          {job.url} · {urls.length} pages discovered
          {job.truncated && " (sitemap truncated)"}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selected.size}</span> of {urls.length} pages selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Select all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            onClick={selectNone}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* Folder groups */}
      <div className="space-y-3">
        {groups.map(({ folder, label, urls: folderUrls }) => {
          const isRoot = folder === "/";
          const allSelected = folderUrls.every((u) => selected.has(u));
          const someSelected = !allSelected && folderUrls.some((u) => selected.has(u));

          return (
            <div key={folder} className="border rounded-lg overflow-hidden">
              {/* Folder header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted cursor-pointer select-none"
                onClick={() => toggleFolder(folderUrls)}
              >
                <IndeterminateCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => toggleFolder(folderUrls)}
                />
                {isRoot
                  ? <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                }
                <span className="font-medium text-sm flex-1">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {folderUrls.filter((u) => selected.has(u)).length}/{folderUrls.length}
                </span>
              </div>

              {/* URL list */}
              <div className="divide-y">
                {folderUrls.map((url) => (
                  <label
                    key={url}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                      selected.has(url) ? "hover:bg-muted/30" : "hover:bg-muted/20 opacity-60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(url)}
                      onChange={() => toggleUrl(url)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span
                      className="text-sm font-mono text-muted-foreground truncate"
                      title={url}
                    >
                      {getPathname(url)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </p>
      )}

      {/* Footer action */}
      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Each page uses one PSI API call · analysis takes ~{Math.ceil(selected.size * 8 / 60)} min
        </p>
        <Button
          onClick={handleStart}
          disabled={loading || selected.size === 0}
          size="lg"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting…</>
          ) : (
            `Analyze ${selected.size} page${selected.size !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Indeterminate Checkbox ───────────────────────────────────────────────────

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 shrink-0 accent-primary"
    />
  );
}
