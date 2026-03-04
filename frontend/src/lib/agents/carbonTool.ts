export function carbonTool(category: string) {
  const emissionMap: Record<string, number> = {
    furniture: 40,
    electronics: 80,
    decor: 20,
    clothing: 15,
    books: 10,
  };

  const baseline = emissionMap[category?.toLowerCase()] || 25;

  const avoidedEmission = baseline * 0.8; // reuse assumption

  return {
    result: {
      avoided_emission: avoidedEmission,
    },
    confidence: 0.85,
  };
}