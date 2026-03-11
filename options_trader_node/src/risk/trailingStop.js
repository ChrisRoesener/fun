import { makeExitSignal } from "../models/types.js";

function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(value, upper));
}

export function evaluateTrailingStop(position, riskCfg) {
  position.highWaterPrice = Math.max(position.highWaterPrice ?? position.currentPrice, position.currentPrice);
  position.highWaterUnrealizedPct = Math.max(
    position.highWaterUnrealizedPct ?? position.unrealizedPct,
    position.unrealizedPct,
  );

  const activation = Number(riskCfg.trailActivationPct ?? 0.15);
  if (position.highWaterUnrealizedPct < activation) {
    return makeExitSignal({
      triggerValue: position.unrealizedPct,
      thresholdValue: activation,
      detail: "Trailing stop not activated.",
    });
  }

  const baseTrail = Number(riskCfg.baseTrailPct ?? 0.2);
  const dteScale = position.dteInitial > 0 ? position.dteRemaining / Math.max(position.dteInitial, 1) : 1;
  const volScale = clamp(
    (position.impliedVolatility || 0.4) / 0.4,
    Number(riskCfg.volatilityScaleMin ?? 0.75),
    Number(riskCfg.volatilityScaleMax ?? 1.25),
  );
  const trailPct = Math.max(0.01, baseTrail * dteScale * volScale);
  const stopPrice = position.highWaterPrice * (1 - trailPct);

  if (position.currentPrice <= stopPrice) {
    return makeExitSignal({
      shouldExit: true,
      reason: "trailing_stop",
      triggerValue: position.currentPrice,
      thresholdValue: stopPrice,
      detail: "Trailing stop hit.",
    });
  }

  return makeExitSignal({
    triggerValue: position.currentPrice,
    thresholdValue: stopPrice,
    detail: "Trailing stop active.",
  });
}
