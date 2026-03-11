from __future__ import annotations

from typing import Any

from broker.base import BrokerAPI
from models.types import Direction


def _safe_close(row: dict[str, Any]) -> float:
    value = row.get("close_price") or row.get("close")
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def momentum_direction(
    broker: BrokerAPI,
    symbol: str,
    short_lookback_days: int = 5,
    long_lookback_days: int = 20,
) -> Direction:
    rows = broker.get_historicals(symbol, span="month", interval="day")
    closes = [_safe_close(r) for r in rows if _safe_close(r) > 0]
    if len(closes) < max(short_lookback_days, long_lookback_days):
        return "neutral"

    short_window = closes[-short_lookback_days:]
    long_window = closes[-long_lookback_days:]
    short_avg = sum(short_window) / len(short_window)
    long_avg = sum(long_window) / len(long_window)

    if short_avg > long_avg * 1.002:
        return "bullish"
    if short_avg < long_avg * 0.998:
        return "bearish"
    return "neutral"
