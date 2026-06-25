import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildAnswer,
  queryPlanJsonSchema,
  queryPlanSchema,
  runSafeQuery,
} from "@/lib/ai-query";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

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

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-5.5",

      instructions: `
You convert plain-English questions into a query plan for an HDB resale dashboard.

Dataset:
- Singapore HDB resale transactions
- Fields: month, town, flat_type, floor_area_sqm, flat_model, lease_commence_date, remaining_lease, resale_price
- flat_type examples: 3 ROOM, 4 ROOM, 5 ROOM, EXECUTIVE
- town values are uppercase, for example ANG MO KIO and TAMPINES

Rules:
- Never create SQL.
- Convert "4-room" into "4 ROOM".
- Convert town names into uppercase.
- Use YYYY-MM for from and to.
- Use null for filters not mentioned.
- For "highest", use order desc.
- For "lowest", use order asc.
- For causal questions, forecasts, investment advice, or recommendations, use intent unsupported.
- The platform can describe historical data only.
      `,

      input: question,

      text: {
        format: {
          type: "json_schema",
          name: "hdb_analytics_plan",
          strict: true,
          schema: queryPlanJsonSchema,
        },
      },
    });

    const plan = queryPlanSchema.parse(
      JSON.parse(response.output_text)
    );

    if (plan.intent === "unsupported") {
      return NextResponse.json({
        answer: buildAnswer(plan, []),
        plan,
        rows: [],
      });
    }

    const rows = await runSafeQuery(plan);

    return NextResponse.json({
      answer: buildAnswer(plan, rows),
      plan,
      rows,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to answer the question.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}