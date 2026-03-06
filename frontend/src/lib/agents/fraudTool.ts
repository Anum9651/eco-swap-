import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function fraudTool(description: string) {
  if (!description) {
    return { result: { fraud_flag: false }, confidence: 0.5 };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are a fraud detection agent for a second-hand marketplace.
Analyse the listing description for: contact details (email/phone), payment outside platform,
urgent language, bitcoin/wire transfer mentions, implausible claims, or spam patterns.
Respond ONLY with valid JSON, no markdown, no backticks: {"flagged": boolean, "confidence": number, "reason": "one sentence or null"}`,
      generationConfig: { temperature: 0 },
    });

    const result = await model.generateContent(`Description: ${description}`);
    const text   = result.response.text();
    const data   = JSON.parse(text.replace(/```json|```/g, "").trim());

    return {
      result:     { fraud_flag: data.flagged ?? false },
      confidence: data.confidence ?? 0.9,
    };

  } catch {
    // Keyword fallback if Gemini fails
    const suspicious = ["urgent", "bitcoin", "wire transfer", "western union", "whatsapp me", "call me"];
    const flagged    = suspicious.some(w => description.toLowerCase().includes(w));
    return {
      result:     { fraud_flag: flagged },
      confidence: flagged ? 0.8 : 0.9,
    };
  }
}