"use client";

import { FormEvent, useState } from "react";

type Answer = {
  answer: string;
  rows: {
    label: string;
    value: number;
  }[];
};

const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

export default function AiAsk() {
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

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to answer question.");
      }

      setResult(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to answer question."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function displayValue(value: number) {
    return Number.isInteger(value)
      ? value.toLocaleString("en-SG")
      : currency.format(value);
  }

  return (
    <section className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-600">
        AI DATA ASSISTANT
      </p>

      <h2 className="mt-1 text-2xl font-semibold text-slate-900">
        Ask the HDB resale data
      </h2>

      <p className="mt-2 text-slate-600">
        Ask for comparisons, trends, transaction volumes, median prices, or
        price per square metre.
      </p>

      <form onSubmit={submit} className="mt-5">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Which towns had the highest median resale price for 4-room flats in 2024?"
          className="min-h-28 w-full rounded-lg border p-3 text-slate-900 placeholder:text-slate-400 bg-white"
        />

        <button
          disabled={isLoading}
          className="mt-3 rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "Analysing..." : "Ask the data"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          "Which towns had the highest median resale price for 4-room flats in 2024?",
          "Show monthly median resale prices from 2024 onwards.",
          "Which flat type has the highest average resale price?",
          "How many million-dollar HDB resale transactions were recorded in 2024?",
        ].map((example) => (
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
        <p className="mt-5 rounded-md bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-lg bg-slate-50 p-5 text-slate-900">
          <p className="font-medium text-slate-900">
            {result.answer}
          </p>

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