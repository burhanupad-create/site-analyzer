# SiteAnalyzer

Full-site performance analysis powered by Google PageSpeed Insights. Discovers your sitemap, crawls every section, and produces a graded, actionable report with PDF and CSV export.

## Features

| Feature | Details |
|---|---|
| Sitemap discovery | Checks `robots.txt`, then common paths (`/sitemap.xml`, `/wp-sitemap.xml`, …) |
| Smart URL filtering | Excludes `/blog`, `/news`, `/tag`, `/category`, CMS query params, media files, UUIDs |
| Section-level scoring | Groups by first-level folder, samples up to **5 pages** per section (important pages prioritised) |
| Mobile / Desktop strategy | Toggle in the UI — strategy is passed through the full pipeline and included in the report |
| Google PageSpeed Insights | Performance · Accessibility · Best Practices · SEO scores per page |
| Core Web Vitals | LCP · CLS · TBT · TTFB · FCP · Speed Index |
| Performance grades | A/B/C/D grade per section and overall — visible in cards and the PDF cover |
| Top Issues aggregation | Ranks the most common Lighthouse opportunities across all pages by occurrences + savings |
| Savings-aware recommendations | Critical / warning / info with estimated ms savings from Lighthouse opportunity data |
| Important pages prioritisation | `/`, `/pricing`, `/about`, `/contact`, `/services` always sampled first |
| In-memory PSI cache | 12-hour TTL; cache hits logged; Redis-ready abstraction in `psi-cache.ts` |
| Concurrency control | `p-limit` caps concurrent PSI requests at 5 — prevents quota spikes |
| Hard URL limits | `MAX_TOTAL_URLS=100`, `MAX_GROUPS=20`, `MAX_PAGES_PER_GROUP=5` — truncation shown in UI |
| Request timeouts | Sitemap: 10 s · PSI: 20 s — `AbortController` on every external fetch |
| Structured error metadata | Every failure captures `{ url, error, stage, timestamp }` |
| Rich report metadata | Duration, cache hits, skipped URLs with reasons, truncation flag, strategy |
| Real-time SSE progress | Live progress bar and step description while analysis runs |
| PDF export | Puppeteer renders the full linearised report (no tabs, no buttons) with page numbers |
| CSV export | All page scores as a UTF-8 CSV with BOM for Excel compatibility |
| Rate limiting hooks | In-process placeholder ready to swap for Upstash — same interface, no route changes |
| GA4 / GSC ready | Type stubs and env placeholders in place for future real-user data integration |

## Quick start

```bash
cp .env.example .env.local
# Add PSI_API_KEY to avoid anonymous rate limits (optional but recommended)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a URL, choose Mobile or Desktop, and click Analyze.

## Strategy selector

The Mobile/Desktop toggle appears below the URL input. It controls the `strategy` parameter sent to the PSI API and is stored in the job record, surfaced in the dashboard header, and included in the PDF cover page.

- **Mobile** (default) — simulates a mid-tier Android device on a 4G connection
- **Desktop** — simulates a desktop browser on a fast connection

## CSV export

After analysis completes, click **CSV** in the dashboard header. The file includes:

`URL, Performance, Accessibility, Best Practices, SEO, LCP (ms), CLS, TBT (ms), FCP (ms), TTFB (ms), Speed Index (ms), Error, From Cache`

## PSI caching

PSI responses are cached in-process for 12 hours keyed by `url + strategy`. Cache hits are shown in the Analysis Summary card. To upgrade to Redis:

1. Install `@upstash/redis`
2. Implement `CacheStore<PageScore>` (interface in `src/lib/psi-cache.ts`)
3. Export your adapter as `psiCache` — no other files change

## Hard limits

| Constant | Default | File |
|---|---|---|
| `MAX_TOTAL_URLS` | 100 | `lib/constants.ts` |
| `MAX_GROUPS` | 20 | `lib/constants.ts` |
| `MAX_PAGES_PER_GROUP` | 5 | `lib/constants.ts` |
| `PSI_CONCURRENCY` | 5 | `lib/constants.ts` |
| `SITEMAP_TIMEOUT_MS` | 10 000 | `lib/constants.ts` |
| `PSI_TIMEOUT_MS` | 20 000 | `lib/constants.ts` |

When limits are hit, a warning is shown in the dashboard and the `metadata.truncated` flag is set in the report JSON.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PSI_API_KEY` | No | Google PageSpeed Insights API key — raises rate limit from ~2 to 240 req/min |
| `UPSTASH_REDIS_REST_URL` | Future | For Redis-backed PSI cache and rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Future | — |
| `GA4_PROPERTY_ID` | Future | Google Analytics 4 property for real-user metric overlays |
| `GA4_SERVICE_ACCOUNT_JSON` | Future | Service account credentials for GA4 |
| `GSC_SITE_URL` | Future | Google Search Console site for CTR-by-section data |
| `GSC_SERVICE_ACCOUNT_JSON` | Future | Service account credentials for GSC |

Get a PSI key at [developers.google.com/speed/docs/insights/v5/get-started](https://developers.google.com/speed/docs/insights/v5/get-started).

## Project structure

```
src/
├── types/index.ts                   # All shared TypeScript interfaces
├── lib/
│   ├── constants.ts                 # Limits, timeouts, thresholds, important paths
│   ├── url-utils.ts                 # URL normalisation, UUID detection, folder grouping
│   ├── job-store.ts                 # In-memory job store (Redis-ready interface)
│   ├── psi-cache.ts                 # 12h TTL cache with CacheStore<T> abstraction
│   ├── grading.ts                   # A/B/C/D grade system
│   └── rate-limit.ts               # Rate limiter interface + in-process placeholder
├── services/
│   ├── sitemap.service.ts           # robots.txt → sitemap discovery, crawl, filter, limits
│   ├── psi.service.ts               # PSI API wrapper: strategy, timeout, cache, opportunities
│   ├── report.service.ts            # p-limit concurrency, folder grouping, top issues, metadata
│   └── pdf.service.ts               # Puppeteer PDF + homepage screenshot
├── app/
│   ├── page.tsx                     # Landing / URL input + strategy selector
│   ├── analysis/[jobId]/page.tsx    # Live dashboard
│   └── api/
│       ├── analyze/route.ts         # POST — start job, rate limit, accept strategy
│       ├── progress/[jobId]/route.ts # GET SSE — stream progress
│       ├── report/[jobId]/route.ts  # GET — fetch completed report JSON
│       ├── pdf/[jobId]/route.ts     # GET — generate & download PDF
│       └── csv/[jobId]/route.ts     # GET — export scores as UTF-8 CSV
└── components/dashboard/
    ├── AnalysisDashboard.tsx        # Main orchestrator: SSE, 4 tabs, CSV + PDF buttons
    ├── SummaryStats.tsx             # Overall score, grade, metadata, truncation warning
    ├── FolderScoreCard.tsx          # Section card with grade badge, score bars, cache indicator
    ├── RecommendationsPanel.tsx     # Severity-grouped recommendations with savings
    ├── TopIssuesPanel.tsx           # Top Lighthouse opportunities ranked by occurrences
    ├── WebVitalsCard.tsx            # LCP / CLS / TBT / TTFB / FCP / Speed Index
    ├── GradeBadge.tsx               # A/B/C/D colour-coded badge
    ├── ProgressIndicator.tsx        # Animated progress during analysis
    ├── UrlInputForm.tsx             # URL input + Mobile/Desktop strategy toggle + API key
    ├── ScoreBadge.tsx               # Circular score badge (good/needs work/poor)
    └── ScoreBar.tsx                 # Horizontal labelled score bar
```

## Scaling to production

| Concern | Current | Upgrade path |
|---|---|---|
| Job store | In-process `Map` | Replace `lib/job-store.ts` with Redis adapter |
| Job queue | Fire-and-forget async | BullMQ or Inngest job queue |
| PSI cache | In-process `Map` | Implement `CacheStore<PageScore>` with Upstash |
| Rate limiting | In-process | Swap `InProcessRateLimiter` for Upstash Ratelimit |
| History | None | PostgreSQL + Prisma; upsert on `updateJob` |
| Real-user data | Stubbed | Wire GA4 + GSC service accounts |
