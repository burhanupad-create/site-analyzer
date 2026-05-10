"use client";

import { getScoreColor, getScoreLabel } from "./ScoreBadge";
import { SCORE_THRESHOLDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface OverallScoreRingProps {
  score: number;
  size?: number;
}

export function OverallScoreRing({ score, size = 120 }: OverallScoreRingProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= SCORE_THRESHOLDS.good
      ? "#10b981"
      : score >= SCORE_THRESHOLDS.needsImprovement
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={10}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div
        className="absolute flex flex-col items-center"
        style={{ marginTop: -(size / 2 + 24) }}
      >
        <span
          className={cn("font-bold tabular-nums", getScoreColor(score))}
          style={{ fontSize: size * 0.22 }}
        >
          {score}
        </span>
        <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}
