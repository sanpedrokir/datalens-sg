import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildDatabricksAnswer,
  buildReportsAnswer,
  databricksPlanJsonSchema,
  databricksPlanSchema,
  runReportsSearch,
  runSafeDatabricksQuery,
  splitReportTextIntoSentences,
} from "@/lib/databricks-query";
import { databricksConfigured } from "@/lib/databricks-ds";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!question || question.length > 500) {
      return NextResponse.json(
        { error: "Enter a question between 1 and 500 characters." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    if (!databricksConfigured()) {
      return NextResponse.json(
        {
          error:
            "Databricks is not configured yet. Set DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN in .env.local.",
        },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-5.5",

      instructions: `
You convert plain-English questions into a query plan for a Databricks lab
that holds three Singapore property datasets, ingested as Delta tables:

- market "hdb": public HDB resale flat transactions
  (property_type examples: 3 ROOM, 4 ROOM, 5 ROOM, EXECUTIVE)
- market "private": URA private residential transactions
  (property_type examples: Condominium, Apartment, Executive Condominium)
- market "reports": extracted text from URA's Q1 2026 market report PDFs
  (price index, rental index, unsold units, transaction volumes, and a
  narrative market/economic outlook summary)

The "hdb" and "private" tables share columns: month, area, property_type,
floor_area_sqm, price. "area" is the HDB town (e.g. ANG MO KIO, TAMPINES) for
market "hdb", and the URA district/planning area code for market "private".

Rules:
- Never write SQL.
- Pick market "hdb" for HDB/resale-flat questions, "private" for condo/private
  residential transaction questions, and "reports" for questions about market
  commentary, outlook, sentiment, vacancy rates, or narrative summaries (things
  a written report would say, not a transaction-level number). If truly
  ambiguous, default to "hdb".
- For market "reports": set reportKeywords to 1-3 short literal phrases (e.g.
  "vacancy", "office", "outlook", "rental index") likely to appear verbatim in
  the report text — this is a literal keyword search, not semantic search.
  Leave metric/groupBy/area/propertyType as their default values; they're
  ignored for this market.
- Convert "4-room" into "4 ROOM". Convert HDB town names to uppercase.
- Use YYYY-MM for from/to. Use null for filters not mentioned.
- For "highest" use order desc, for "lowest" use order asc.
- For causal questions, forecasts, investment advice, or cross-market
  recommendations, use intent unsupported.
- This lab can only describe historical data already loaded into Databricks.
      `,

      input: question,

      text: {
        format: {
          type: "json_schema",
          name: "databricks_lab_plan",
          strict: true,
          schema: databricksPlanJsonSchema,
        },
      },
    });

    const plan = databricksPlanSchema.parse(
      JSON.parse(response.output_text)
    );

    if (plan.intent === "unsupported") {
      return NextResponse.json({
        answer: buildDatabricksAnswer(plan, []),
        plan,
        rows: [],
      });
    }

    if (plan.market === "reports") {
      const keywords = plan.reportKeywords || [];
      const matches = await runReportsSearch(keywords);

      return NextResponse.json({
        answer: buildReportsAnswer(keywords, matches),
        plan,
        rows: [],
        reportMatches: matches.map((m) => ({
          filename: m.filename,
          page: m.page,
          sentences: splitReportTextIntoSentences(m.text),
        })),
      });
    }

    const rows = await runSafeDatabricksQuery(plan);

    return NextResponse.json({
      answer: buildDatabricksAnswer(plan, rows),
      plan,
      rows,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to answer the question.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
