"use client";

import { cn } from "@/lib/utils";
import {
  GRADE_BG_COLORS,
  GRADE_COLORS,
  GRADE_LABELS,
  scoreToGrade,
} from "@/lib/grading";
import type { PerformanceGrade } from "@/types";

interface GradeBadgeProps {
  grade?: PerformanceGrade;
  score?: number; // alternative: derive grade from score
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function GradeBadge({ grade, score, size = "md", showLabel }: GradeBadgeProps) {
  const resolved = grade ?? (score != null ? scoreToGrade(score) : "D");

  const sizeClasses = {
    sm: "w-8 h-8 text-sm font-bold",
    md: "w-10 h-10 text-lg font-bold",
    lg: "w-14 h-14 text-2xl font-bold",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "rounded-lg border-2 flex items-center justify-center",
          sizeClasses[size],
          GRADE_BG_COLORS[resolved]
        )}
      >
        <span className={GRADE_COLORS[resolved]}>{resolved}</span>
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">
          {GRADE_LABELS[resolved]}
        </span>
      )}
    </div>
  );
}
