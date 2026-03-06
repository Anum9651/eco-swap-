import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI   = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    const { data: myListings } = await supabase
      .from("listings")
      .select("title, category, description")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(5);

    if (!myListings || myListings.length === 0) {
      return NextResponse.json({ matches: [], reason: "No active listings to match against." });
    }

    const { data: otherListings } = await supabase
      .from("listings")
      .select("id, title, category, description, condition, listing_type, image_url, eco_score")
      .neq("user_id", userId)
      .eq("status", "active")
      .limit(30);

    if (!otherListings || otherListings.length === 0) {
      return NextResponse.json({ matches: [], reason: "No other listings available." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are a swap matching agent. Given a user's listings and available listings from others,
find the 3 best matches the user might want to swap for.
Consider: category relevance, complementary items, condition.
Respond ONLY with valid JSON, no markdown, no backticks: {"matches": [{"id": "listing_id", "reason": "one sentence why this is a good match"}]}`,
      generationConfig: { temperature: 0 },
    });

    const result = await model.generateContent(
      `MY LISTINGS:\n${JSON.stringify(myListings, null, 2)}\n\nAVAILABLE LISTINGS:\n${JSON.stringify(
        otherListings.map(l => ({ id: l.id, title: l.title, category: l.category, condition: l.condition })),
        null, 2
      )}`
    );

    const text = result.response.text();
    const data = JSON.parse(text.replace(/```json|```/g, "").trim());

    const enriched = (data.matches ?? []).map((m: any) => {
      const listing = otherListings.find((l) => l.id === m.id);
      return listing ? { ...listing, match_reason: m.reason } : null;
    }).filter(Boolean);

    return NextResponse.json({ matches: enriched });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}