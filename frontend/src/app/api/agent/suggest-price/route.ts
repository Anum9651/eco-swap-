import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
  try {
    const { title, category, condition, description } = await req.json();

    const result = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: `You are a pricing agent for a second-hand marketplace.
Suggest a fair resale price in GBP (£) based on item details.
Consider: category, condition, typical second-hand value.
Respond ONLY with valid JSON: {"min": number, "max": number, "suggested": number, "reasoning": "one sentence"}`,
      messages: [{
        role: "user",
        content: `Title: ${title}\nCategory: ${category}\nCondition: ${condition}\nDescription: ${description ?? "none"}`,
      }],
    });

    const text = result.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}