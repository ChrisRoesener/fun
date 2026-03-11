from __future__ import annotations

import math
from typing import Any


def average_true_range(candles: list[dict[str, Any]], period: int = 14) -> float:
    if len(candles) < 2:
        return 0.0

    highs: list[float] = []
    lows: list[float] = []
    closes: list[float] = []
    for c in candles:
        try:
            highs.append(float(c.get("high_price") or c.get("high")))
            lows.append(float(c.get("low_price") or c.get("low")))
            closes.append(float(c.get("close_price") or c.get("close")))
        except (TypeError, ValueError):
            continue

    if len(closes) < 2:
        return 0.0

    true_ranges: list[float] = []
    for i in range(1, len(closes)):
        high = highs[i]
        low = lows[i]
        prev_close = closes[i - 1]
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        true_ranges.append(max(tr, 0.0))

    if not true_ranges:
        return 0.0
    window = true_ranges[-period:] if len(true_ranges) > period else true_ranges
    return sum(window) / len(window)


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def black_scholes_delta(
    spot: float,
    strike: float,
    time_years: float,
    rate: float,
    volatility: float,
    option_type: str,
) -> float:
    if min(spot, strike, time_years, volatility) <= 0:
        return 0.0
    d1 = (math.log(spot / strike) + (rate + 0.5 * volatility**2) * time_years) / (volatility * math.sqrt(time_years))
    if option_type.lower() == "call":
        return _norm_cdf(d1)
    return _norm_cdf(d1) - 1.0
