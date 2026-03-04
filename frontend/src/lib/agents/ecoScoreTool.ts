export function ecoScoreTool(avoidedCarbon: number) {
  const carbonScore = Math.min(avoidedCarbon, 100);

  const reuseFactor = 70;
  const materialFactor = 60;

  const ecoScore =
    reuseFactor * 0.4 +
    materialFactor * 0.3 +
    carbonScore * 0.3;

  return {
    result: {
      eco_score: Math.round(ecoScore),
    },
    confidence: 0.9,
  };
}