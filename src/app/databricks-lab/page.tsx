import Link from "next/link";
import DatabricksAsk from "@/components/databricks-ask";

export const metadata = {
  title: "Databricks Lab — DataLens",
};

export default function DatabricksLabPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to DataLens
        </Link>

        <div className="mt-4 mb-8">
          <p className="text-sm font-medium text-orange-600">
            DATA + AI PLATFORM EXPLORATION
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Databricks Lab
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            A sandbox page for trying out Databricks (free tier) alongside the
            main Neon-backed dashboard. It loads HDB resale data, URA private
            residential transactions, and URA report text as Delta
            tables/Volumes, and answers plain-English questions the same way
            the main AI assistant does — just pointed at Databricks instead of
            Postgres.
          </p>

          <div className="mt-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">
              ⚠ This lab runs on Databricks Free Edition, which has no
              internet access.
            </p>
            <p className="mt-1 text-amber-800">
              Free Edition&apos;s compute can&apos;t call external APIs
              directly, so all data here is fetched and pre-loaded ahead of
              time rather than live. Answers only cover whatever&apos;s
              already been ingested — they won&apos;t reflect anything more
              recent, and a market with no table loaded yet will return a
              &quot;table not found&quot; error rather than fresh data.
            </p>
          </div>
        </div>

        <DatabricksAsk />

        <p className="mt-6 text-xs text-slate-400">
          This is an experimental lab, not part of the main dashboard. The
          main DataLens app and its Neon database are unaffected by anything
          here.
        </p>
      </div>
    </main>
  );
}
