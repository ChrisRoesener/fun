import { makeExitSignal } from "../models/types.js";

export function hardStopThreshold(riskCfg, position) {
  const base = Number(riskCfg.hardStopPct ?? 0.3);
  const floor = Number(riskCfg.hardStopFloorPct ?? 0.1);
  if (!position.dteInitial || position.dteInitial <= 0) {
    return { base, adjusted: base };
  }
  const adjusted = Math.max(floor, base * (position.dteRemaining / Math.max(position.dteInitial, 1)));
  return { base, adjusted };
}

function adverseUnderlyingMove(position) {
  if (position.optionType === "call") {
    return Math.max(position.entryUnderlyingPrice - position.currentUnderlyingPrice, 0);
  }
  return Math.max(position.currentUnderlyingPrice - position.entryUnderlyingPrice, 0);
}

export function evaluateStopLoss(position, riskCfg) {
  const currentLoss = -position.unrealizedPct;
  if (currentLoss <= 0) return makeExitSignal();

  const { base, adjusted } = hardStopThreshold(riskCfg, position);
  if (currentLoss >= base) {
    return makeExitSignal({
      shouldExit: true,
      reason: "hard_stop",
      triggerValue: currentLoss,
      thresholdValue: base,
      detail: "Base hard stop threshold breached.",
    });
  }

  if (adjusted < base && currentLoss >= adjusted) {
    return makeExitSignal({
      shouldExit: true,
      reason: "time_decay_stop",
      triggerValue: currentLoss,
      thresholdValue: adjusted,
      detail: "Time-decay-adjusted stop threshold breached.",
    });
  }

  const atrMultiple = Number(riskCfg.atrMultipleStop ?? 1);
  if (position.atr > 0) {
    const adverse = adverseUnderlyingMove(position);
    const threshold = position.atr * atrMultiple;
    if (adverse >= threshold) {
      return makeExitSignal({
        shouldExit: true,
        reason: "underlying_atr_stop",
        triggerValue: adverse,
        thresholdValue: threshold,
        detail: "Underlying moved adversely beyond ATR threshold.",
      });
    }
  }

  return makeExitSignal({
    triggerValue: currentLoss,
    thresholdValue: adjusted,
    detail: "No stop-loss trigger.",
  });
}
