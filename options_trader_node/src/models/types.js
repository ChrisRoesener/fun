/**
 * @typedef {"call"|"put"} Side
 * @typedef {"bullish"|"bearish"|"neutral"} Direction
 * @typedef {"buy_to_open"|"sell_to_close"} Action
 * @typedef {"hard_stop"|"time_decay_stop"|"underlying_atr_stop"|"trailing_stop"|"mandatory_dte_exit"} ExitReason
 */

export const nowIso = () => new Date().toISOString();

export function makeExitSignal({
  shouldExit = false,
  reason = null,
  triggerValue = null,
  thresholdValue = null,
  detail = "",
} = {}) {
  return { shouldExit, reason, triggerValue, thresholdValue, detail };
}
