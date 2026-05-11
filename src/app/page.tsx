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
    desc: "Groups pages by folder and aggregates PageSpeed scores per section.",
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
    title: "Actionable Reports",
    desc: "Prioritized recommendations ranked by impact and severity.",
  },
  {
    icon: Search,
    title: "PDF Export",
    desc: "Download a complete print-ready PDF report to share with stakeholders.",
  },
];

export default function HomePage() {
  return (
    <main id="top" className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <section className="bg-background flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 gap-7">
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.16em] uppercase text-[#abe5b1] bg-[#abe5b1]/10 border border-[#abe5b1]/25 px-4 py-2">
          <Zap className="h-3 w-3" />
          Powered by Google PageSpeed Insights
        </div>

        <h1 className="text-5xl sm:text-6xl font-medium tracking-tight max-w-2xl leading-none text-[#e7f6ea]">
          Full-Site{" "}
          <span className="text-[#abe5b1]">Performance</span>{" "}
          Analysis in Minutes
        </h1>

        <p className="text-base text-[#90c0a6] max-w-xl leading-relaxed">
          Enter any URL. We&apos;ll discover your sitemap, crawl every section, run
          Google PageSpeed Insights on each page, and deliver a ranked report with
          actionable recommendations.
        </p>

        <UrlInputForm />

        <p className="text-[10px] text-[#283b43] tracking-[0.14em] uppercase font-medium">
          No account required · No data stored · Results ready in 2–5 minutes
        </p>
      </section>

      {/* ── Stats ── */}
      <section className="bg-[#0c1215]">
        <div className="max-w-4xl mx-auto px-4 py-16 grid grid-cols-3">
          {[
            { value: "100+", label: "Pages per scan" },
            { value: "6",    label: "Core metrics tracked" },
            { value: "2–5m", label: "Average report time" },
          ].map(({ value, label }, i) => (
            <div key={label} className="flex flex-col items-center gap-2 px-6 relative">
              {i > 0 && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-12 w-px bg-[#abe5b1]/10" />
              )}
              <span className="text-6xl sm:text-7xl font-medium text-[#abe5b1] leading-none tracking-tight">
                {value}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#90c0a6]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-background">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#90c0a6] mb-10 text-center">
            What you get
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#abe5b1]/8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-[#0f1518] p-7 flex flex-col gap-4 hover:bg-[#135545]/12 transition-colors"
              >
                <div className="w-10 h-10 bg-[#135545] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-[#d0edd6]" />
                </div>
                <div>
                  <h3 className="font-medium text-[11px] mb-2 uppercase tracking-[0.12em] text-[#abe5b1]">
                    {title}
                  </h3>
                  <p className="text-sm text-[#90c0a6] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
