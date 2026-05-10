"use client";

import { Recommendation, RecommendationSeverity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const severityConfig: Record<
  RecommendationSeverity,
  { label: string; icon: React.ElementType; color: string; badgeVariant: string }
> = {
  critical: {
    label: "Critical",
    icon: XCircle,
    color: "text-red-500",
    badgeVariant: "destructive",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    color: "text-amber-500",
    badgeVariant: "secondary",
  },
  info: {
    label: "Info",
    icon: Info,
    color: "text-blue-500",
    badgeVariant: "outline",
  },
};

const categoryLabels: Record<string, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  seo: "SEO",
  "best-practices": "Best Practices",
  general: "General",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const config = severityConfig[rec.severity];
  const Icon = config.icon;

  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm leading-snug">{rec.title}</span>
          <Badge
            variant={config.badgeVariant as "destructive" | "secondary" | "outline" | "default"}
            className="text-xs"
          >
            {config.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {categoryLabels[rec.category] ?? rec.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
        <div className="flex items-start gap-1.5 mt-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground italic">{rec.impact}</p>
        </div>
        {rec.affectedFolders && rec.affectedFolders.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {rec.affectedFolders.map((f) => (
              <code key={f} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {f}
              </code>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const critical = recommendations.filter((r) => r.severity === "critical");
  const warnings = recommendations.filter((r) => r.severity === "warning");
  const info = recommendations.filter((r) => r.severity === "info");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          Optimization Recommendations
          <Badge variant="secondary">{recommendations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {critical.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">
              Critical ({critical.length})
            </h3>
            <div className="space-y-2">
              {critical.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </section>
        )}
        {warnings.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">
              Warnings ({warnings.length})
            </h3>
            <div className="space-y-2">
              {warnings.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </section>
        )}
        {info.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2">
              Suggestions ({info.length})
            </h3>
            <div className="space-y-2">
              {info.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
