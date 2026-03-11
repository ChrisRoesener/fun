import { toFloat } from "../scanner/filters.js";

export function momentumDirection(candles, shortLookback = 5, longLookback = 20) {
  const closes = candles
    .map((c) => toFloat(c.closePrice ?? c.close))
    .filter((v) => v > 0);

  if (closes.length < Math.max(shortLookback, longLookback)) return "neutral";

  const short = closes.slice(-shortLookback);
  const long = closes.slice(-longLookback);

  const shortAvg = short.reduce((a, b) => a + b, 0) / short.length;
  const longAvg = long.reduce((a, b) => a + b, 0) / long.length;

  if (shortAvg > longAvg * 1.002) return "bullish";
  if (shortAvg < longAvg * 0.998) return "bearish";
  return "neutral";
}
