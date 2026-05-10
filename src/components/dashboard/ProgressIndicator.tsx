"use client";

import { Progress } from "@/components/ui/progress";
import { Loader2, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressEvent } from "@/types";

interface ProgressIndicatorProps {
  event: ProgressEvent;
}

export function ProgressIndicator({ event }: ProgressIndicatorProps) {
  return (
    <Card className="max-w-xl mx-auto">
      <CardContent className="pt-8 pb-8 px-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <Globe className="h-12 w-12 text-primary opacity-20" />
            <Loader2 className="h-12 w-12 text-primary animate-spin absolute inset-0" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Analyzing your site…</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.currentStep}
          </p>
        </div>

        <div className="space-y-2">
          <Progress value={event.progress} className="h-2" />
          <p className="text-xs text-muted-foreground tabular-nums">
            {event.progress}% complete
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          This may take a few minutes depending on the number of pages.
          <br />
          Each page is analyzed via Google PageSpeed Insights.
        </p>
      </CardContent>
    </Card>
  );
}
