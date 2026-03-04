import { NextResponse } from "next/server";
import { processListingAgent } from "@/lib/agents/agentController";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId } = body;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid listingId" },
        { status: 400 }
      );
    }

    await processListingAgent(listingId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-listing] Agent error:", message);
    return NextResponse.json(
      { error: "Agent processing failed", detail: message },
      { status: 500 }
    );
  }
}