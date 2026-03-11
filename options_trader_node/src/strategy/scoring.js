import { normalizeZeroToOne } from "../scanner/filters.js";

export function scoreCandidate({
  optionType,
  delta,
  spreadPctValue,
  impliedVolatility,
  probabilityLong,
  deltaMin,
  deltaMax,
  maxSpread,
}) {
  const absDelta = optionType === "put" ? Math.abs(delta) : delta;
  const targetDelta = (deltaMin + deltaMax) / 2;
  const deltaDistance = Math.abs(absDelta - targetDelta);

  const deltaQuality = 1 - normalizeZeroToOne(deltaDistance, 0, Math.max(deltaMax - deltaMin, 1e-6));
  const spreadTightness = 1 - normalizeZeroToOne(spreadPctValue, 0, maxSpread);
  const ivFavorability = 1 - normalizeZeroToOne(impliedVolatility, 0.2, 0.6);
  const popScore = normalizeZeroToOne(probabilityLong, 0.3, 0.8);

  const score = deltaQuality * 0.3 + spreadTightness * 0.2 + ivFavorability * 0.2 + popScore * 0.3;
  return Math.max(0, Math.min(score, 1));
}
