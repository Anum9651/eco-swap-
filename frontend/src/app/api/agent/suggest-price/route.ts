import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { title, category, condition, description } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are a pricing agent for a second-hand marketplace.
Suggest a fair resale price in GBP based on item details.
Consider: category, condition, and typical second-hand market value.
Respond ONLY with valid JSON, no markdown, no backticks: {"min": number, "max": number, "suggested": number, "reasoning": "one sentence"}`,
      generationConfig: { temperature: 0 },
    });

    const result = await model.generateContent(
      `Title: ${title}\nCategory: ${category}\nCondition: ${condition}\nDescription: ${description ?? "none"}`
    );

    const text = result.response.text();
    const data = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(data);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}