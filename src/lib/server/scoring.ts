import { readScoringConfig, type ScoringConfig } from "@/lib/server/settings";

type ScoringWeights = ScoringConfig["weights"];

const defaultWeights: ScoringWeights = {
  priceWeight: 0.4,
  uptimeWeight: 0.35,
  reviewWeight: 0.25,
};

let cachedWeights: ScoringWeights = defaultWeights;
let lastLoadedAt = 0;
const REFRESH_MS = 5000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function priceToScore(pricePerMillion: number | null) {
  if (pricePerMillion === null) return 70;
  return clamp(120 - pricePerMillion * 10, 0, 100);
}

export async function getScoringWeights() {
  const now = Date.now();
  if (now - lastLoadedAt > REFRESH_MS) {
    try {
      const config = await readScoringConfig();
      cachedWeights = config.weights;
      lastLoadedAt = now;
    } catch {
      cachedWeights = defaultWeights;
      lastLoadedAt = now;
    }
  }
  return cachedWeights;
}

export function primeScoringWeights(weights: ScoringWeights) {
  cachedWeights = weights;
  lastLoadedAt = Date.now();
}

export async function calcCompositeScore(input: {
  uptimeRate: number;
  avgRating: number | null;
  inputPricePerMillion: number | null;
}) {
  const weights = await getScoringWeights();
  const reviewScore = input.avgRating ? input.avgRating * 20 : 75;
  const uptimeScore = clamp(input.uptimeRate * 100, 0, 100);
  const priceScore = priceToScore(input.inputPricePerMillion);

  return Number(
    (
      priceScore * weights.priceWeight +
      uptimeScore * weights.uptimeWeight +
      reviewScore * weights.reviewWeight
    ).toFixed(2),
  );
}
