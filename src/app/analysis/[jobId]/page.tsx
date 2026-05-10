import { AnalysisDashboard } from "@/components/dashboard/AnalysisDashboard";

interface PageProps {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ print?: string }>;
}

export default async function AnalysisPage({ params, searchParams }: PageProps) {
  const { jobId } = await params;
  const { print } = await searchParams;
  const isPrint = print === "1";

  return (
    <div className={isPrint ? "bg-white" : "min-h-screen bg-background"}>
      <div className={isPrint ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        <AnalysisDashboard jobId={jobId} isPrint={isPrint} />
      </div>
    </div>
  );
}
