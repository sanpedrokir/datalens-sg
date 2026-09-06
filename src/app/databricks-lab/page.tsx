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
            main Neon-backed dashboard. It loads HDB resale data and URA
            private residential transactions as Delta tables and answers
            plain-English questions the same way the main AI assistant does —
            just pointed at Databricks instead of Postgres.
          </p>
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
