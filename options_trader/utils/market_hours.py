from __future__ import annotations

from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo


NY = ZoneInfo("America/New_York")
MARKET_OPEN = time(hour=9, minute=30)
MARKET_CLOSE = time(hour=16, minute=0)


def is_us_market_open_now(now_utc: datetime | None = None) -> bool:
    now = now_utc or datetime.now(tz=UTC)
    ny_time = now.astimezone(NY)

    if ny_time.weekday() >= 5:
        return False
    current_t = ny_time.time()
    return MARKET_OPEN <= current_t <= MARKET_CLOSE
