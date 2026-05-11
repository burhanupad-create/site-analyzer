"use client";

import { TopIssue } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopIssuesPanelProps {
  issues: TopIssue[];
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function severityColor(avgMs: number): string {
  if (avgMs >= 1000) return "text-red-500";
  if (avgMs >= 500) return "text-amber-500";
  return "text-blue-500";
}

function severityBg(avgMs: number): string {
  if (avgMs >= 1000) return "bg-red-50 border-red-200";
  if (avgMs >= 500) return "bg-amber-50 border-amber-200";
  return "bg-blue-50 border-blue-200";
}

function severityLabel(avgMs: number): string {
  if (avgMs >= 1000) return "High Impact";
  if (avgMs >= 500) return "Medium";
  return "Low";
}

function formatAuditTitle(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopIssuesPanel({ issues }: TopIssuesPanelProps) {
  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-primary" />
            Top Issues Across Site
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No significant optimization opportunities were detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-4 w-4 text-primary" />
          Top Issues Across Site
          <Badge variant="secondary">{issues.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Most common Lighthouse opportunities ranked by occurrences and potential savings.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.map((issue, idx) => (
          <div
            key={issue.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              severityBg(issue.avgSavingsMs)
            )}
          >
            {/* Rank */}
            <div className="w-6 h-6 rounded-full bg-background border flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
              {idx + 1}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">
                  {formatAuditTitle(issue.id)}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-xs", severityColor(issue.avgSavingsMs))}
                >
                  {severityLabel(issue.avgSavingsMs)}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{issue.occurrences}</span>
                  {issue.occurrences === 1 ? "page affected" : "pages affected"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Avg savings:{" "}
                  <span className={cn("font-medium", severityColor(issue.avgSavingsMs))}>
                    {formatMs(issue.avgSavingsMs)}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  Total savings:{" "}
                  <span className="font-medium">
                    {formatMs(issue.totalSavingsMs)}
                  </span>
                </span>
              </div>

              {/* Affected URLs (collapsed) */}
              {issue.affectedUrls.length > 0 && (
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Show affected pages
                  </summary>
                  <ul className="mt-1.5 space-y-0.5">
                    {issue.affectedUrls.map((u) => (
                      <li key={u}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-muted-foreground hover:text-foreground truncate block max-w-xs"
                          title={u}
                        >
                          {(() => { try { return new URL(u).pathname; } catch { return u; } })()}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
