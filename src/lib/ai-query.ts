import { z } from "zod";
import { sql } from "@/lib/ds";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const queryPlanSchema = z.object({
  intent: z.enum(["query", "unsupported"]),

  metric: z.enum([
    "median_resale_price",
    "average_resale_price",
    "transaction_count",
    "average_price_per_sqm",
    "million_dollar_sales",
  ]),

  groupBy: z.enum(["month", "town", "flat_type", "none"]),

  from: z.string().regex(monthPattern).nullable(),
  to: z.string().regex(monthPattern).nullable(),

  town: z.string().max(100).nullable(),
  flatType: z.string().max(100).nullable(),

  order: z.enum(["asc", "desc"]),
  limit: z.number().int().min(1).max(24),

  unsupportedReason: z.string().nullable(),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

export const queryPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "string",
      enum: ["query", "unsupported"],
    },
    metric: {
      type: "string",
      enum: [
        "median_resale_price",
        "average_resale_price",
        "transaction_count",
        "average_price_per_sqm",
        "million_dollar_sales",
      ],
    },
    groupBy: {
      type: "string",
      enum: ["month", "town", "flat_type", "none"],
    },
    from: {
      anyOf: [
        { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$" },
        { type: "null" },
      ],
    },
    to: {
      anyOf: [
        { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$" },
        { type: "null" },
      ],
    },
    town: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    flatType: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    order: {
      type: "string",
      enum: ["asc", "desc"],
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 24,
    },
    unsupportedReason: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
  required: [
    "intent",
    "metric",
    "groupBy",
    "from",
    "to",
    "town",
    "flatType",
    "order",
    "limit",
    "unsupportedReason",
  ],
};

const metricSql = {
  median_resale_price: `
    ROUND(
      (
        PERCENTILE_CONT(0.5)
        WITHIN GROUP (ORDER BY h.resale_price)
      )::numeric
    )::int
  `,

  average_resale_price: `
    ROUND(AVG(h.resale_price))::int
  `,

  transaction_count: `
    COUNT(*)::int
  `,

  average_price_per_sqm: `
    ROUND(
      AVG(h.resale_price / NULLIF(h.floor_area_sqm, 0))
    )::int
  `,

  million_dollar_sales: `
    COUNT(*) FILTER (
      WHERE h.resale_price >= 1000000
    )::int
  `,
};

const groupSql = {
  month: `TO_CHAR(DATE_TRUNC('month', h.month), 'YYYY-MM')`,
  town: `h.town`,
  flat_type: `h.flat_type`,
  none: `'Selected transactions'`,
};

function monthToDate(value: string | null) {
  return value ? `${value}-01` : null;
}

export async function runSafeQuery(plan: QueryPlan) {
  const selectedMetric = metricSql[plan.metric];
  const selectedGroup = groupSql[plan.groupBy];

  const grouping =
    plan.groupBy === "none" ? "" : "GROUP BY 1";

  const order =
    plan.order === "asc" ? "ASC" : "DESC";

  const limit =
    plan.groupBy === "none" ? 1 : plan.limit;

  const rows = await sql.query(
    `
      SELECT
        ${selectedGroup} AS label,
        ${selectedMetric} AS value
      FROM hdb_resale_transactions h
      WHERE
        ($1::date IS NULL OR h.month >= $1::date)
        AND (
          $2::date IS NULL
          OR h.month < ($2::date + INTERVAL '1 month')
        )
        AND ($3::text IS NULL OR h.town = $3::text)
        AND ($4::text IS NULL OR h.flat_type = $4::text)
      ${grouping}
      ORDER BY value ${order}
      LIMIT $5
    `,
    [
      monthToDate(plan.from),
      monthToDate(plan.to),
      plan.town,
      plan.flatType,
      limit,
    ]
  );

  return rows.map((row) => ({
    label: String(row.label),
    value: Number(row.value ?? 0),
  }));
}

const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

function metricLabel(metric: QueryPlan["metric"]) {
  const labels = {
    median_resale_price: "median resale price",
    average_resale_price: "average resale price",
    transaction_count: "transaction count",
    average_price_per_sqm: "average price per sqm",
    million_dollar_sales: "million-dollar sales",
  };

  return labels[metric];
}

function displayValue(metric: QueryPlan["metric"], value: number) {
  if (
    metric === "transaction_count" ||
    metric === "million_dollar_sales"
  ) {
    return value.toLocaleString("en-SG");
  }

  return currency.format(value);
}

export function buildAnswer(
  plan: QueryPlan,
  rows: { label: string; value: number }[]
) {
  if (plan.intent === "unsupported") {
    return (
      plan.unsupportedReason ||
      "This dashboard can describe the available HDB resale data, but cannot establish causes, provide property recommendations, or predict future prices."
    );
  }

  if (rows.length === 0) {
    return "No matching transactions were found. Try a wider date range or remove one of the filters.";
  }

  const label = metricLabel(plan.metric);

  if (plan.groupBy === "none") {
    return `For the selected transactions, the ${label} is ${displayValue(
      plan.metric,
      rows[0].value
    )}.`;
  }

  const direction =
    plan.order === "desc" ? "highest" : "lowest";

  return `The ${direction} ${label} is ${displayValue(
    plan.metric,
    rows[0].value
  )} for ${rows[0].label}.`;
}