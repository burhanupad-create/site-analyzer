"use client";

import { cn } from "@/lib/utils";
import { SCORE_THRESHOLDS } from "@/lib/constants";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "text-emerald-400";
  if (score >= SCORE_THRESHOLDS.needsImprovement) return "text-amber-400";
  return "text-red-400";
}

export function getScoreBg(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "bg-emerald-500/10 border-emerald-500/25";
  if (score >= SCORE_THRESHOLDS.needsImprovement) return "bg-amber-500/10 border-amber-500/25";
  return "bg-red-500/10 border-red-500/25";
}

export function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "Good";
  if (score >= SCORE_THRESHOLDS.needsImprovement) return "Needs Work";
  return "Poor";
}

export function ScoreBadge({ score, size = "md", showLabel, label }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "text-sm w-10 h-10",
    md: "text-xl w-14 h-14",
    lg: "text-3xl w-20 h-20",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "rounded-full border-2 flex items-center justify-center font-bold tabular-nums",
          sizeClasses[size],
          getScoreBg(score)
        )}
      >
        <span className={getScoreColor(score)}>{score}</span>
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">
          {label ?? getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
