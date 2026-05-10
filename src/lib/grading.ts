/**
 * Performance Grade System
 *
 * A/B/C/D based on composite score (average of all 4 PSI categories).
 * Thresholds deliberately align with Google's "good / needs improvement / poor"
 * buckets but add a B tier for nuance.
 */

import type { CategoryScores, PerformanceGrade } from "@/types";

// ─── Grade Rules ──────────────────────────────────────────────────────────────

const GRADE_RULES: Array<{ min: number; grade: PerformanceGrade }> = [
  { min: 90, grade: "A" },
  { min: 75, grade: "B" },
  { min: 60, grade: "C" },
  { min: 0,  grade: "D" },
];

export function scoreToGrade(score: number): PerformanceGrade {
  for (const rule of GRADE_RULES) {
    if (score >= rule.min) return rule.grade;
  }
  return "D";
}

export function categoryScoresToGrade(scores: CategoryScores): PerformanceGrade {
  const avg = Math.round(
    (scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4
  );
  return scoreToGrade(avg);
}

// ─── Grade Display Helpers ────────────────────────────────────────────────────

export const GRADE_COLORS: Record<PerformanceGrade, string> = {
  A: "text-emerald-600",
  B: "text-green-500",
  C: "text-amber-500",
  D: "text-red-500",
};

export const GRADE_BG_COLORS: Record<PerformanceGrade, string> = {
  A: "bg-emerald-50 border-emerald-300",
  B: "bg-green-50 border-green-300",
  C: "bg-amber-50 border-amber-300",
  D: "bg-red-50 border-red-300",
};

export const GRADE_LABELS: Record<PerformanceGrade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Needs Work",
  D: "Poor",
};
