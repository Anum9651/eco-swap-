export function fraudTool(description: string) {
  if (!description) {
    return {
      result: { fraud_flag: false },
      confidence: 0.5,
    };
  }

  const suspiciousKeywords = ["urgent", "bitcoin", "wire transfer"];

  const lowered = description.toLowerCase();

  const flagged = suspiciousKeywords.some((word) =>
    lowered.includes(word)
  );

  return {
    result: {
      fraud_flag: flagged,
    },
    confidence: flagged ? 0.8 : 0.95,
  };
}