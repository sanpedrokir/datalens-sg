import { z } from "zod";
import { runDatabricksQuery } from "@/lib/databricks-ds";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const catalog = process.env.DATABRICKS_CATALOG || "workspace";
const schema = process.env.DATABRICKS_SCHEMA || "sg_property";

// Both Delta tables are ingested with this shared column shape so one
// query builder can serve either market — see /databricks/ingest_*.py.
//   month DATE, area STRING, property_type STRING,
//   floor_area_sqm DOUBLE, price DOUBLE
const tableByMarket = {
  hdb: `${catalog}.${schema}.hdb_resale`,
  private: `${catalog}.${schema}.ura_private_transactions`,
};

export const databricksPlanSchema = z.object({
  intent: z.enum(["query", "unsupported"]),

  market: z.enum(["hdb", "private"]),

  metric: z.enum([
    "median_price",
    "average_price",
    "transaction_count",
    "average_price_per_sqm",
  ]),

  groupBy: z.enum(["month", "area", "property_type", "none"]),

  from: z.string().regex(monthPattern).nullable(),
  to: z.string().regex(monthPattern).nullable(),

  area: z.string().max(100).nullable(),
  propertyType: z.string().max(100).nullable(),

  order: z.enum(["asc", "desc"]),
  limit: z.number().int().min(1).max(24),

  unsupportedReason: z.string().nullable(),
});

export type DatabricksPlan = z.infer<typeof databricksPlanSchema>;

export const databricksPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["query", "unsupported"] },
    market: { type: "string", enum: ["hdb", "private"] },
    metric: {
      type: "string",
      enum: [
        "median_price",
        "average_price",
        "transaction_count",
        "average_price_per_sqm",
      ],
    },
    groupBy: {
      type: "string",
      enum: ["month", "area", "property_type", "none"],
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
    area: { anyOf: [{ type: "string" }, { type: "null" }] },
    propertyType: { anyOf: [{ type: "string" }, { type: "null" }] },
    order: { type: "string", enum: ["asc", "desc"] },
    limit: { type: "integer", minimum: 1, maximum: 24 },
    unsupportedReason: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [
    "intent",
    "market",
    "metric",
    "groupBy",
    "from",
    "to",
    "area",
    "propertyType",
    "order",
    "limit",
    "unsupportedReason",
  ],
};

const metricSql = {
  median_price: `
    ROUND(
      (PERCENTILE_APPROX(price, 0.5))::decimal
    )::bigint
  `,
  average_price: `ROUND(AVG(price))::bigint`,
  transaction_count: `COUNT(*)`,
  average_price_per_sqm: `
    ROUND(AVG(price / NULLIF(floor_area_sqm, 0)))::bigint
  `,
};

const groupSql = {
  month: `date_format(date_trunc('month', month), 'yyyy-MM')`,
  area: `area`,
  property_type: `property_type`,
  none: `'Selected transactions'`,
};

function monthToDate(value: string | null) {
  return value ? `${value}-01` : null;
}

export async function runSafeDatabricksQuery(plan: DatabricksPlan) {
  const table = tableByMarket[plan.market];
  const selectedMetric = metricSql[plan.metric];
  const selectedGroup = groupSql[plan.groupBy];

  const grouping = plan.groupBy === "none" ? "" : "GROUP BY 1";
  const order = plan.order === "asc" ? "ASC" : "DESC";
  const limit = plan.groupBy === "none" ? 1 : plan.limit;

  const rows = await runDatabricksQuery(
    `
      SELECT
        ${selectedGroup} AS label,
        ${selectedMetric} AS value
      FROM ${table}
      WHERE
        (? IS NULL OR month >= to_date(?, 'yyyy-MM-dd'))
        AND (? IS NULL OR month < add_months(to_date(?, 'yyyy-MM-dd'), 1))
        AND (? IS NULL OR area = ?)
        AND (? IS NULL OR property_type = ?)
      ${grouping}
      ORDER BY value ${order}
      LIMIT ${limit}
    `,
    [
      monthToDate(plan.from),
      monthToDate(plan.from),
      monthToDate(plan.to),
      monthToDate(plan.to),
      plan.area,
      plan.area,
      plan.propertyType,
      plan.propertyType,
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

function metricLabel(metric: DatabricksPlan["metric"]) {
  const labels = {
    median_price: "median price",
    average_price: "average price",
    transaction_count: "transaction count",
    average_price_per_sqm: "average price per sqm",
  };

  return labels[metric];
}

function displayValue(metric: DatabricksPlan["metric"], value: number) {
  if (metric === "transaction_count") {
    return value.toLocaleString("en-SG");
  }

  return currency.format(value);
}

export function buildDatabricksAnswer(
  plan: DatabricksPlan,
  rows: { label: string; value: number }[]
) {
  if (plan.intent === "unsupported") {
    return (
      plan.unsupportedReason ||
      "This lab can describe historical HDB and URA private residential data, but cannot establish causes, provide recommendations, or predict future prices."
    );
  }

  if (rows.length === 0) {
    return "No matching transactions were found in Databricks. Try a wider date range or remove a filter.";
  }

  const marketLabel = plan.market === "hdb" ? "HDB resale" : "URA private residential";
  const label = metricLabel(plan.metric);

  if (plan.groupBy === "none") {
    return `For the selected ${marketLabel} transactions, the ${label} is ${displayValue(
      plan.metric,
      rows[0].value
    )}.`;
  }

  const direction = plan.order === "desc" ? "highest" : "lowest";

  return `The ${direction} ${marketLabel} ${label} is ${displayValue(
    plan.metric,
    rows[0].value
  )} for ${rows[0].label}.`;
}
