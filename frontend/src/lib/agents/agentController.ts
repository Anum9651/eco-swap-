import { supabase } from "../supabase";
import { carbonTool } from "./carbonTool";
import { ecoScoreTool } from "./ecoScoreTool";
import { fraudTool } from "./fraudTool";
import { logAgent } from "./logger";

export async function processListingAgent(listingId: string) {
  console.log("Agent started for ID:", listingId);

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  console.log("Fetch result:", listing);
  console.log("Fetch error:", error);

  if (!listing) {
    throw new Error("Listing not found");
  }

  // 1️⃣ Carbon Agent
  const carbonResult = carbonTool(listing.category);

  await logAgent(
    listingId,
    "CarbonAgent",
    { category: listing.category },
    carbonResult.result,
    carbonResult.confidence
  );

  // 2️⃣ Eco Score Agent
  const ecoResult = ecoScoreTool(
    carbonResult.result.avoided_emission
  );

  await logAgent(
    listingId,
    "EcoScoreAgent",
    { avoidedCarbon: carbonResult.result.avoided_emission },
    ecoResult.result,
    ecoResult.confidence
  );

  // 3️⃣ Fraud Agent
  const fraudResult = fraudTool(listing.description);

  await logAgent(
    listingId,
    "FraudAgent",
    { description: listing.description },
    fraudResult.result,
    fraudResult.confidence
  );

  // Update listing
  await supabase
    .from("listings")
    .update({
      eco_score: ecoResult.result.eco_score,
      carbon_estimated: carbonResult.result.avoided_emission,
      fraud_flag: fraudResult.result.fraud_flag,
    })
    .eq("id", listingId);

  console.log("Agent completed successfully");
}