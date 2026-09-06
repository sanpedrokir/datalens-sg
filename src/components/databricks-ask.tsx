"use client";

import { FormEvent, useState } from "react";

type Answer = {
  answer: string;
  plan: { market: "hdb" | "private" | "reports" };
  rows: { label: string; value: number }[];
  reportMatches?: { filename: string; page: number; sentences: string[] }[];
};

const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

const examples = [
  "What is the median HDB resale price by town in 2024?",
  "Compare average price per sqm for 4-room flats vs condominiums in 2024.",
  "Which URA district had the highest average private residential price in 2024?",
  "What does the URA report say about office vacancy?",
  "What's the market outlook according to the URA report?",
];

export default function DatabricksAsk() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!question.trim()) return;

    try {
      setIsLoading(true);
      setError("");
      setResult(null);

      const response = await fetch("/api/databricks-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to answer question.");
      }

      setResult(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to answer question."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function displayValue(value: number) {
    return Number.isInteger(value) && value < 100
      ? value.toLocaleString("en-SG")
      : currency.format(value);
  }

  return (
    <section className="rounded-xl border border-orange-100 bg-orange-50 p-6 shadow-sm">
      <p className="text-sm font-medium text-orange-600">
        DATABRICKS LAB — EXPERIMENTAL
      </p>

      <h2 className="mt-1 text-2xl font-semibold text-slate-900">
        Ask HDB + URA data via Databricks
      </h2>

      <p className="mt-2 text-slate-600">
        Runs against Delta tables in a free-tier Databricks workspace instead
        of the main Neon database. Ask about HDB resale flats or URA private
        residential transactions.
      </p>

      <form onSubmit={submit} className="mt-5">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Which URA district had the highest average private residential price in 2024?"
          className="min-h-28 w-full rounded-lg border p-3 text-slate-900 placeholder:text-slate-400 bg-white"
        />

        <button
          disabled={isLoading}
          className="mt-3 rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "Querying Databricks..." : "Ask Databricks"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => setQuestion(example)}
            className="rounded-full border px-3 py-1 text-sm text-slate-700"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-5 rounded-md bg-red-50 p-3 text-red-700">{error}</p>
      )}

      {result && (
        <div className="mt-6 rounded-lg bg-slate-50 p-5 text-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Source:{" "}
            {result.plan.market === "hdb"
              ? "HDB resale (hdb_resale)"
              : result.plan.market === "private"
              ? "URA private residential (ura_private_transactions)"
              : "URA report text, keyword search (ura_reports)"}
          </p>

          <p className="mt-1 font-medium text-slate-900">{result.answer}</p>

          {result.reportMatches && result.reportMatches.length > 0 && (
            <div className="mt-4 space-y-3">
              {result.reportMatches.map((match, i) => (
                <div
                  key={`${match.filename}-${match.page}-${i}`}
                  className="rounded-lg border bg-white p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {match.filename} — page {match.page}
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                    {match.sentences.map((sentence, j) => (
                      <li key={j}>{sentence}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {result.rows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-700">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Value</th>
                  </tr>
                </thead>

                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.label} className="border-b">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-right font-medium">
                        {displayValue(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
