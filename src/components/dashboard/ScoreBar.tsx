"use client";

import { cn } from "@/lib/utils";
import { SCORE_THRESHOLDS } from "@/lib/constants";

interface ScoreBarProps {
  label: string;
  score: number;
  className?: string;
}

function barColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "bg-emerald-500";
  if (score >= SCORE_THRESHOLDS.needsImprovement) return "bg-amber-400";
  return "bg-red-500";
}

export function ScoreBar({ label, score, className }: ScoreBarProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            score >= SCORE_THRESHOLDS.good
              ? "text-emerald-600"
              : score >= SCORE_THRESHOLDS.needsImprovement
              ? "text-amber-500"
              : "text-red-500"
          )}
        >
          {score}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
