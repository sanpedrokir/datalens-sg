"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AiAsk from "@/components/ai-ask";

type DashboardData = {
  summary: {
    transactionCount: number;
    averagePrice: number;
    medianPrice: number;
    averagePricePerSqm: number;
    millionDollarSales: number;
  };
  monthly: {
    period: string;
    medianPrice: number;
    transactions: number;
  }[];
  topTowns: {
    town: string;
    medianPrice: number;
    transactions: number;
  }[];
  flatTypes: {
    flatType: string;
    averagePrice: number;
    transactions: number;
  }[];
};

type Props = {
  towns: string[];
  flatTypes: string[];
};

const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

const wholeNumber = new Intl.NumberFormat("en-SG");

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardClient({ towns, flatTypes }: Props) {
  const [filters, setFilters] = useState({
    from: "2024-01",
    to: "",
    town: "",
    flatType: "",
  });

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await fetch(
        `/api/dashboard?${params.toString()}`,
        { cache: "no-store" }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load dashboard.");
      }

      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard."
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function updateFilter(
    key: keyof typeof filters,
    value: string
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      from: "2024-01",
      to: "",
      town: "",
      flatType: "",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            DATA ANALYTICS PLATFORM
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            DataLens
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Explore HDB resale transactions, compare towns and flat types,
            and ask questions in plain English.
          </p>
        </div>

        <AiAsk />

        <section className="mb-8 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              From month
              <input
                type="month"
                value={filters.from}
                onChange={(event) =>
                  updateFilter("from", event.target.value)
                }
                className="mt-1 w-full rounded-md border p-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              To month
              <input
                type="month"
                value={filters.to}
                onChange={(event) =>
                  updateFilter("to", event.target.value)
                }
                className="mt-1 w-full rounded-md border p-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Town
              <select
                value={filters.town}
                onChange={(event) =>
                  updateFilter("town", event.target.value)
                }
                className="mt-1 w-full rounded-md border p-2"
              >
                <option value="">All towns</option>
                {towns.map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Flat type
              <select
                value={filters.flatType}
                onChange={(event) =>
                  updateFilter("flatType", event.target.value)
                }
                className="mt-1 w-full rounded-md border p-2"
              >
                <option value="">All flat types</option>
                {flatTypes.map((flatType) => (
                  <option key={flatType} value={flatType}>
                    {flatType}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={resetFilters}
            className="mt-4 rounded-md border px-4 py-2 text-sm font-medium"
          >
            Reset filters
          </button>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {isLoading || !data ? (
          <div className="rounded-xl border bg-white p-8 text-slate-600">
            Loading dashboard data...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Transactions"
                value={wholeNumber.format(data.summary.transactionCount)}
              />

              <MetricCard
                title="Median resale price"
                value={currency.format(data.summary.medianPrice)}
              />

              <MetricCard
                title="Average resale price"
                value={currency.format(data.summary.averagePrice)}
              />

              <MetricCard
                title="Average price per sqm"
                value={currency.format(data.summary.averagePricePerSqm)}
              />

              <MetricCard
                title="Million-dollar sales"
                value={wholeNumber.format(data.summary.millionDollarSales)}
              />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">
                  Monthly median resale price
                </h2>

                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis
                        tickFormatter={(value) =>
                          `$${Math.round(Number(value) / 1000)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value) =>
                          currency.format(Number(value))
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="medianPrice"
                        name="Median resale price"
                        stroke="#2563eb"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">
                  Towns with highest median resale prices
                </h2>

                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topTowns}
                      layout="vertical"
                      margin={{ left: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) =>
                          `$${Math.round(Number(value) / 1000)}k`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="town"
                        width={100}
                      />
                      <Tooltip
                        formatter={(value) =>
                          currency.format(Number(value))
                        }
                      />
                      <Bar
                        dataKey="medianPrice"
                        name="Median resale price"
                        fill="#0f766e"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-2">
                <h2 className="text-lg font-semibold">
                  Average resale price by flat type
                </h2>

                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.flatTypes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="flatType" />
                      <YAxis
                        tickFormatter={(value) =>
                          `$${Math.round(Number(value) / 1000)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value) =>
                          currency.format(Number(value))
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="averagePrice"
                        name="Average resale price"
                        fill="#7c3aed"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}