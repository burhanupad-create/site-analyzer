import { UrlInputForm } from "@/components/dashboard/UrlInputForm";
import { Globe, Zap, FileText, BarChart3, ShieldCheck, Search } from "lucide-react";

const FEATURES = [
  {
    icon: Globe,
    title: "Sitemap Discovery",
    desc: "Automatically finds your sitemap via robots.txt and common paths.",
  },
  {
    icon: BarChart3,
    title: "Section-Level Scores",
    desc: "Groups pages by folder and aggregates Google PageSpeed scores per section.",
  },
  {
    icon: Zap,
    title: "Core Web Vitals",
    desc: "Surfaces LCP, CLS, TBT, TTFB and FCP for your most important pages.",
  },
  {
    icon: ShieldCheck,
    title: "Accessibility & SEO",
    desc: "Flags accessibility gaps and SEO issues across all site sections.",
  },
  {
    icon: FileText,
    title: "Actionable Recommendations",
    desc: "Prioritized, specific recommendations ranked by impact and severity.",
  },
  {
    icon: Search,
    title: "PDF Reports",
    desc: "Download a complete, print-ready PDF report to share with stakeholders.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <section className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 gap-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full border">
          <Zap className="h-3.5 w-3.5 text-primary" />
          Powered by Google PageSpeed Insights
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-2xl leading-tight">
          Full-Site{" "}
          <span className="text-primary">Performance</span>{" "}
          Analysis in Minutes
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
          Enter any URL. We&apos;ll discover your sitemap, crawl every section, analyze
          each with Google PageSpeed Insights, and deliver a ranked report with
          actionable recommendations.
        </p>

        <UrlInputForm />

        <p className="text-xs text-muted-foreground">
          No account required · No data stored · Results ready in 2–5 minutes
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-card border rounded-xl p-5 flex gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
