export function getSafetyScore(question, optionIndex) {
  const scoreItem = question?.predictableIndexMap?.find((item) => item.optionIndex === optionIndex);
  return scoreItem?.safetyScore ?? 5;
}

export function calculateRoundScore(question, targetChoice, observerGuessedChoice) {
  const safetyScore = getSafetyScore(question, targetChoice);
  const guessedCorrectly = targetChoice === observerGuessedChoice;
  return Number((safetyScore * (guessedCorrectly ? 1.2 : 0.8)).toFixed(2));
}

export function normalizePredictability(rawScore) {
  const capped = Math.max(0, Math.min(rawScore, 12));
  return Math.round((capped / 12) * 100);
}

export function getArchetype(totalPredictabilityIndex) {
  if (totalPredictabilityIndex >= 80) return "The Standard Script";
  if (totalPredictabilityIndex >= 50) return "The Guarded Citizen";
  if (totalPredictabilityIndex >= 20) return "The Wildcard";
  return "The Enigma";
}

export function calculateFinalMetrics(roundsData, questionsById) {
  if (!roundsData.length) {
    return {
      totalPredictabilityIndex: 0,
      archetypeLabel: "The Enigma",
      dimensions: {
        conformity: 0,
        predictability: 0,
        riskTolerance: 0,
        transparency: 0,
        perceptibility: 0
      }
    };
  }

  const normalizedRounds = roundsData.map((round) => normalizePredictability(round.predictabilityScore ?? 0));
  const totalPredictabilityIndex = Math.round(
    normalizedRounds.reduce((sum, score) => sum + score, 0) / normalizedRounds.length
  );

  const truthCount = roundsData.filter((round) => round.isLie === false).length;
  const correctChoiceCount = roundsData.filter(
    (round) => round.targetChoice === round.observerGuessedChoice
  ).length;
  const safetyScores = roundsData.map((round) => {
    const question = round.question ?? questionsById.get(String(round.questionId));
    return getSafetyScore(question, round.targetChoice);
  });
  const safetyAverage = safetyScores.reduce((sum, score) => sum + score, 0) / safetyScores.length;

  return {
    totalPredictabilityIndex,
    archetypeLabel: getArchetype(totalPredictabilityIndex),
    dimensions: {
      conformity: Math.round(safetyAverage * 10),
      predictability: totalPredictabilityIndex,
      riskTolerance: Math.round((10 - safetyAverage) * 10),
      transparency: Math.round((truthCount / roundsData.length) * 100),
      perceptibility: Math.round((correctChoiceCount / roundsData.length) * 100)
    }
  };
}
