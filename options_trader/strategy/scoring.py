from __future__ import annotations

from scanner.filters import normalize_zero_to_one


def score_candidate(
    option_type: str,
    delta: float,
    spread_pct_value: float,
    implied_volatility: float,
    probability_long: float,
    delta_min: float,
    delta_max: float,
    max_spread: float,
) -> float:
    target_delta = (delta_min + delta_max) / 2
    if option_type == "put":
        delta = abs(delta)

    delta_distance = abs(delta - target_delta)
    delta_quality = 1.0 - normalize_zero_to_one(delta_distance, 0.0, max(delta_max - delta_min, 1e-6))
    spread_tightness = 1.0 - normalize_zero_to_one(spread_pct_value, 0.0, max_spread)
    iv_favorability = 1.0 - normalize_zero_to_one(implied_volatility, 0.20, 0.60)
    pop_score = normalize_zero_to_one(probability_long, 0.30, 0.80)

    score = (delta_quality * 0.3) + (spread_tightness * 0.2) + (iv_favorability * 0.2) + (pop_score * 0.3)
    return max(0.0, min(score, 1.0))
