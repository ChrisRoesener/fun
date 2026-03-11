import { toFloat } from "../scanner/filters.js";

export function averageTrueRange(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < 2) return 0;

  const highs = candles.map((c) => toFloat(c.highPrice ?? c.high)).filter((v) => v > 0);
  const lows = candles.map((c) => toFloat(c.lowPrice ?? c.low)).filter((v) => v >= 0);
  const closes = candles.map((c) => toFloat(c.closePrice ?? c.close)).filter((v) => v > 0);

  if (highs.length < 2 || lows.length < 2 || closes.length < 2) return 0;

  const n = Math.min(highs.length, lows.length, closes.length);
  const trueRanges = [];
  for (let i = 1; i < n; i += 1) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    trueRanges.push(Math.max(tr, 0));
  }

  if (trueRanges.length === 0) return 0;
  const window = trueRanges.slice(-period);
  return window.reduce((a, b) => a + b, 0) / window.length;
}
