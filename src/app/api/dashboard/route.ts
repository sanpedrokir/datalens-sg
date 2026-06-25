import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/ds";

const filterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  town: z.string().max(100).optional(),
  flatType: z.string().max(100).optional(),
});

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function GET(request: NextRequest) {
  try {
    const getOptional = (name: string) =>
      request.nextUrl.searchParams.get(name) || undefined;

    const filters = filterSchema.parse({
      from: getOptional("from"),
      to: getOptional("to"),
      town: getOptional("town"),
      flatType: getOptional("flatType"),
    });

    const fromDate = filters.from ? `${filters.from}-01` : null;
    const toDate = filters.to ? `${filters.to}-01` : null;
    const town = filters.town ?? null;
    const flatType = filters.flatType ?? null;

    const where = sql`
      WHERE
        (${fromDate}::date IS NULL OR h.month >= ${fromDate}::date)
        AND (
          ${toDate}::date IS NULL
          OR h.month < (${toDate}::date + INTERVAL '1 month')
        )
        AND (${town}::text IS NULL OR h.town = ${town}::text)
        AND (${flatType}::text IS NULL OR h.flat_type = ${flatType}::text)
    `;

    const [summaryRows, monthlyRows, townRows, flatTypeRows] =
      await sql.transaction([
        sql`
          SELECT
            COUNT(*)::int AS transaction_count,
            COALESCE(ROUND(AVG(h.resale_price))::int, 0) AS average_price,
            COALESCE(
              ROUND(
                (
                  PERCENTILE_CONT(0.5)
                  WITHIN GROUP (ORDER BY h.resale_price)
                )::numeric
              )::int,
              0
            ) AS median_price,
            COALESCE(
              ROUND(
                AVG(h.resale_price / NULLIF(h.floor_area_sqm, 0))
              )::int,
              0
            ) AS average_price_per_sqm,
            COUNT(*) FILTER (
              WHERE h.resale_price >= 1000000
            )::int AS million_dollar_sales
          FROM hdb_resale_transactions h
          ${where}
        `,

        sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', h.month), 'YYYY-MM') AS period,
            ROUND(
              (
                PERCENTILE_CONT(0.5)
                WITHIN GROUP (ORDER BY h.resale_price)
              )::numeric
            )::int AS median_price,
            COUNT(*)::int AS transactions
          FROM hdb_resale_transactions h
          ${where}
          GROUP BY 1
          ORDER BY 1
        `,

        sql`
          SELECT
            h.town,
            ROUND(
              (
                PERCENTILE_CONT(0.5)
                WITHIN GROUP (ORDER BY h.resale_price)
              )::numeric
            )::int AS median_price,
            COUNT(*)::int AS transactions
          FROM hdb_resale_transactions h
          ${where}
          GROUP BY h.town
          ORDER BY median_price DESC, transactions DESC
          LIMIT 12
        `,

        sql`
          SELECT
            h.flat_type,
            ROUND(AVG(h.resale_price))::int AS average_price,
            COUNT(*)::int AS transactions
          FROM hdb_resale_transactions h
          ${where}
          GROUP BY h.flat_type
          ORDER BY average_price DESC
        `,
      ]);

    const summary = summaryRows[0] ?? {};

    return NextResponse.json({
      summary: {
        transactionCount: asNumber(summary.transaction_count),
        averagePrice: asNumber(summary.average_price),
        medianPrice: asNumber(summary.median_price),
        averagePricePerSqm: asNumber(summary.average_price_per_sqm),
        millionDollarSales: asNumber(summary.million_dollar_sales),
      },

      monthly: monthlyRows.map((row) => ({
        period: String(row.period),
        medianPrice: asNumber(row.median_price),
        transactions: asNumber(row.transactions),
      })),

      topTowns: townRows.map((row) => ({
        town: String(row.town),
        medianPrice: asNumber(row.median_price),
        transactions: asNumber(row.transactions),
      })),

      flatTypes: flatTypeRows.map((row) => ({
        flatType: String(row.flat_type),
        averagePrice: asNumber(row.average_price),
        transactions: asNumber(row.transactions),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}