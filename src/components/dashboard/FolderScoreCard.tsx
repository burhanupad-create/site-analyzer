"use client";

import { FolderReport } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge, getScoreColor } from "./ScoreBadge";
import { ScoreBar } from "./ScoreBar";
import { GradeBadge } from "./GradeBadge";
import { FolderOpen, Globe, Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderScoreCardProps {
  folder: FolderReport;
  isPrint?: boolean;
}

function overallScore(avg: FolderReport["averageScore"]): number {
  return Math.round(
    (avg.performance + avg.accessibility + avg.bestPractices + avg.seo) / 4
  );
}

export function FolderScoreCard({ folder, isPrint }: FolderScoreCardProps) {
  const overall = overallScore(folder.averageScore);
  const isRoot = folder.folder === "/";

  return (
    <Card className={cn("overflow-hidden", isPrint && "break-inside-avoid")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isRoot ? (
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <CardTitle className="text-base font-semibold truncate">
              {folder.label}
            </CardTitle>
            {folder.isImportant && (
              <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="Important page" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs">
              {folder.pageCount} {folder.pageCount === 1 ? "page" : "pages"}
            </Badge>
            <GradeBadge grade={folder.grade} size="sm" />
            <ScoreBadge score={overall} size="sm" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{folder.folder}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {folder.allFailed ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">PSI analysis failed for all pages in this section</p>
              {folder.scores[0]?.error && (
                <p className="text-xs text-red-600 font-mono break-all">{folder.scores[0].error}</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <ScoreBar label="Performance" score={folder.averageScore.performance} />
            <ScoreBar label="Accessibility" score={folder.averageScore.accessibility} />
            <ScoreBar label="Best Practices" score={folder.averageScore.bestPractices} />
            <ScoreBar label="SEO" score={folder.averageScore.seo} />
          </>
        )}

        {folder.sampleUrls.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              {folder.scores.length} page{folder.scores.length !== 1 ? "s" : ""} analyzed
            </summary>
            <ul className="mt-2 space-y-1.5">
              {folder.scores.map((s) => (
                <li key={s.url} className="text-xs flex items-center justify-between gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground truncate max-w-[200px] font-mono"
                    title={s.url}
                  >
                    {(() => { try { return new URL(s.url).pathname || "/"; } catch { return s.url; } })()}
                  </a>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.fromCache && (
                      <span className="text-xs text-muted-foreground/60" title="Served from cache">
                        ↩
                      </span>
                    )}
                    {s.error ? (
                      <span className="text-red-500">Error</span>
                    ) : (
                      <span className={cn("font-semibold tabular-nums", getScoreColor(s.performance))}>
                        {s.performance}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
