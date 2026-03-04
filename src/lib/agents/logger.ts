import { supabase } from "../supabase";

export async function logAgent(
  listingId: string,
  agentName: string,
  inputData: any,
  outputData: any,
  confidence: number
) {
  await supabase.from("agent_logs").insert({
    listing_id: listingId,
    agent_name: agentName,
    input_data: inputData,
    output_data: outputData,
    confidence_score: confidence,
  });
}