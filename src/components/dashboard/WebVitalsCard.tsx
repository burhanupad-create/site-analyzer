"use client";

import { PageScore } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebVitalsCardProps {
  score: PageScore;
  title?: string;
}

interface Vital {
  key: keyof PageScore;
  label: string;
  unit: string;
  good: number;
  poor: number;
  lowerIsBetter: boolean;
}

const VITALS: Vital[] = [
  { key: "lcp", label: "LCP", unit: "ms", good: 2500, poor: 4000, lowerIsBetter: true },
  { key: "fcp", label: "FCP", unit: "ms", good: 1800, poor: 3000, lowerIsBetter: true },
  { key: "tbt", label: "TBT", unit: "ms", good: 200, poor: 600, lowerIsBetter: true },
  { key: "ttfb", label: "TTFB", unit: "ms", good: 800, poor: 1800, lowerIsBetter: true },
  { key: "si", label: "Speed Index", unit: "ms", good: 3400, poor: 5800, lowerIsBetter: true },
  { key: "cls", label: "CLS", unit: "", good: 0.1, poor: 0.25, lowerIsBetter: true },
];

function vitalColor(value: number, vital: Vital): string {
  if (vital.lowerIsBetter) {
    if (value <= vital.good) return "text-emerald-600";
    if (value <= vital.poor) return "text-amber-500";
    return "text-red-500";
  }
  if (value >= vital.good) return "text-emerald-600";
  if (value >= vital.poor) return "text-amber-500";
  return "text-red-500";
}

function formatValue(value: number, unit: string): string {
  if (unit === "ms") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
  }
  if (unit === "") return value.toFixed(3); // CLS
  return `${value}${unit}`;
}

export function WebVitalsCard({ score, title = "Core Web Vitals" }: WebVitalsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono truncate">{score.url}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {VITALS.map((vital) => {
            const raw = score[vital.key];
            const value = typeof raw === "number" ? raw : null;
            return (
              <div key={vital.key} className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">{vital.label}</p>
                {value != null ? (
                  <p className={cn("text-lg font-bold tabular-nums", vitalColor(value, vital))}>
                    {formatValue(value, vital.unit)}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-muted-foreground">—</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
