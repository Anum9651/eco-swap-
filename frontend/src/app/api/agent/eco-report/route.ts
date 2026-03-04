import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { eco_points, swap_count, donate_count, level } = await req.json();

    if (eco_points === undefined) {
      return NextResponse.json({ error: "Missing user stats" }, { status: 400 });
    }

    const prompt = `You are an eco-impact analyst for Eco-Swap, a sustainable swapping platform.

A user has the following stats:
- Eco Points: ${eco_points}
- Level: ${level}
- Completed Swaps: ${swap_count}
- Items Donated: ${donate_count}
- Total items kept from landfill: ${swap_count + donate_count}

Generate a personalised eco-impact report. Respond ONLY with a valid JSON object, no markdown, no backticks:

{
  "summary": "A warm 1-2 sentence personalised summary of their environmental contribution",
  "co2_saved_kg": <number — estimated kg of CO2 saved based on items swapped/donated, avg 5kg per item>,
  "items_diverted": <number — total items kept from landfill>,
  "equivalent": "<a relatable real-world equivalent, e.g. '3 tree seedlings grown for 10 years'>",
  "tip": "A specific, actionable eco tip tailored to their activity level",
  "badge": "<a single relevant emoji badge reflecting their level>"
}`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("");

    const clean = raw.replace(/```json|```/g, "").trim();
    const report = JSON.parse(clean);

    return NextResponse.json({ report });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[eco-report] Error:", msg);
    return NextResponse.json({ error: "Report generation failed", detail: msg }, { status: 500 });
  }
}