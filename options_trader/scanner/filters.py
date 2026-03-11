from __future__ import annotations

from datetime import date, datetime


def parse_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def parse_int(value: object, default: int = 0) -> int:
    try:
        return int(float(value))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def dte_from_expiration(expiration_date: str, today: date | None = None) -> int:
    base = today or date.today()
    exp = datetime.strptime(expiration_date, "%Y-%m-%d").date()
    return max((exp - base).days, 0)


def spread_pct(bid: float, ask: float) -> float:
    mid = (bid + ask) / 2 if (bid + ask) > 0 else 0.0
    if mid <= 0:
        return 1.0
    return (ask - bid) / mid


def passes_dte(dte: int, dte_min: int, dte_max: int) -> bool:
    return dte_min <= dte <= dte_max


def passes_delta(option_type: str, delta: float, delta_min: float, delta_max: float) -> bool:
    if option_type == "call":
        return delta_min <= delta <= delta_max
    if option_type == "put":
        return -delta_max <= delta <= -delta_min
    return False


def passes_open_interest(open_interest: int, minimum: int) -> bool:
    return open_interest >= minimum


def passes_spread_pct(spread: float, maximum: float) -> bool:
    return spread <= maximum


def normalize_zero_to_one(value: float, lower: float, upper: float) -> float:
    if upper <= lower:
        return 0.0
    clipped = max(lower, min(value, upper))
    return (clipped - lower) / (upper - lower)
