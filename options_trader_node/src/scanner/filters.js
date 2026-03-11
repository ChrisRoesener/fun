export function toFloat(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function dteFromExpiration(expirationDate, now = new Date()) {
  const exp = new Date(`${expirationDate}T00:00:00`);
  const diffMs = exp.getTime() - now.getTime();
  return Math.max(Math.floor(diffMs / (24 * 60 * 60 * 1000)), 0);
}

export function spreadPct(bid, ask) {
  const mid = (bid + ask) / 2;
  if (mid <= 0) return 1;
  return (ask - bid) / mid;
}

export function normalizeZeroToOne(value, lower, upper) {
  if (upper <= lower) return 0;
  const clipped = Math.max(lower, Math.min(upper, value));
  return (clipped - lower) / (upper - lower);
}

export function passDelta(optionType, delta, min, max) {
  if (optionType === "call") return delta >= min && delta <= max;
  if (optionType === "put") return delta <= -min && delta >= -max;
  return false;
}
