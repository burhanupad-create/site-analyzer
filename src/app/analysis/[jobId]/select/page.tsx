import { PagePicker } from "@/components/dashboard/PagePicker";

export default async function SelectPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <PagePicker jobId={jobId} />
      </div>
    </main>
  );
}
