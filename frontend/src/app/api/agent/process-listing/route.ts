import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI   = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CO2_BY_CATEGORY: Record<string, number> = {
  "Electronics":        15,
  "Clothing & Apparel":  4,
  "Furniture":          25,
  "Books & Media":       1,
  "Sports & Outdoors":   8,
  "Toys & Games":        3,
  "Kitchen & Home":      6,
  "Tools & Hardware":   10,
  "Vehicles & Parts":   40,
  "Other":               5,
};

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0 },
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

export async function POST(req: Request) {
  try {
    const { listingId } = await req.json();
    if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const co2Base = CO2_BY_CATEGORY[listing.category] ?? 5;

    // Run all 3 agents in parallel
    const [ecoText, fraudText, improvedDesc] = await Promise.all([

      // Agent 1: Eco scoring
      callGemini(
        `You are an eco-impact scoring agent. Score items 1-100 based on environmental benefit of reuse.
Consider: category CO2 baseline (${co2Base}kg), condition, description quality, and reuse potential.
Respond ONLY with valid JSON, no markdown, no backticks: {"score": number, "reason": "one sentence", "co2_saved_kg": number}`,
        `Title: ${listing.title}\nCategory: ${listing.category}\nCondition: ${listing.condition}\nDescription: ${listing.description ?? "none"}`
      ),

      // Agent 2: Fraud detection
      callGemini(
        `You are a fraud detection agent for a swap/donate marketplace.
Flag listings that: contain contact info (emails, phones), seem like spam, request money for free items, or are clearly inappropriate.
Respond ONLY with valid JSON, no markdown, no backticks: {"flagged": boolean, "reason": "one sentence or null"}`,
        `Title: ${listing.title}\nDescription: ${listing.description ?? "none"}\nPrice: ${listing.price ?? "free"}`
      ),

      // Agent 3: Description improver
      callGemini(
        `You are a listing description writer for an eco-swap marketplace.
Given rough notes or a basic description, write a clear, friendly, 2-3 sentence product description.
Highlight condition, what it is good for, and why it is worth swapping.
Respond ONLY with the improved description text — no JSON, no preamble.`,
        `Title: ${listing.title}\nCategory: ${listing.category}\nCondition: ${listing.condition}\nOriginal description: ${listing.description ?? "no description provided"}`
      ),
    ]);

    // Parse results
    let ecoData   = { score: 50, reason: "", co2_saved_kg: co2Base };
    let fraudData = { flagged: false, reason: null };

    try { ecoData   = JSON.parse(ecoText.replace(/```json|```/g, "").trim());   } catch {}
    try { fraudData = JSON.parse(fraudText.replace(/```json|```/g, "").trim()); } catch {}

    // Fetch user profile for coordinates
    const { data: profile } = await supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", listing.user_id)
      .single();

    // Update listing with all AI results
    await supabase.from("listings").update({
      eco_score:   Math.min(100, Math.max(1, Math.round(ecoData.score))),
      fraud_flag:  fraudData.flagged,
      description: improvedDesc?.trim() || listing.description,
      latitude:    profile?.latitude  ?? listing.latitude,
      longitude:   profile?.longitude ?? listing.longitude,
    }).eq("id", listingId);

    // Award eco points if not flagged
    if (!fraudData.flagged) {
      await supabase.rpc("increment_eco_points", {
        user_id: listing.user_id,
        amount:  5,
      });
    }

    return NextResponse.json({
      success:     true,
      eco_score:   ecoData.score,
      co2_saved:   ecoData.co2_saved_kg,
      fraud_flag:  fraudData.flagged,
      description: improvedDesc,
    });

  } catch (err: any) {
    console.error("Agent error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}