import { notFound, redirect } from "next/navigation";
import { getJob } from "@/lib/job-store";
import { PagePicker } from "@/components/dashboard/PagePicker";

export default async function SelectPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) notFound();

  // If analysis already started or completed, go straight to the result
  if (job.status === "running" || job.status === "completed") {
    redirect(`/analysis/${jobId}`);
  }

  if (job.status === "failed") {
    redirect(`/?crawlError=${encodeURIComponent(job.error ?? "Sitemap discovery failed")}`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <PagePicker jobId={jobId} job={job} />
      </div>
    </main>
  );
}
