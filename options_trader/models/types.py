from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal


Side = Literal["call", "put"]
Action = Literal["buy_to_open", "sell_to_close"]
Direction = Literal["bullish", "bearish", "neutral"]
ExitReason = Literal[
    "hard_stop",
    "time_decay_stop",
    "underlying_atr_stop",
    "trailing_stop",
    "mandatory_dte_exit",
]


@dataclass(slots=True)
class OptionCandidate:
    symbol: str
    option_type: Side
    expiration_date: str
    strike: float
    dte: int
    bid: float
    ask: float
    mark: float
    mid: float
    spread_pct: float
    open_interest: int
    implied_volatility: float
    delta: float
    theta: float
    probability_long: float
    score: float
    direction: Direction
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Position:
    symbol: str
    option_type: Side
    expiration_date: str
    strike: float
    quantity: int
    entry_price: float
    entry_underlying_price: float
    current_price: float
    current_underlying_price: float
    dte_initial: int
    dte_remaining: int
    delta: float
    theta: float
    implied_volatility: float
    atr: float = 0.0
    high_water_price: float = 0.0
    high_water_unrealized_pct: float = 0.0
    opened_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    external_id: str | None = None

    @property
    def unrealized_pct(self) -> float:
        if self.entry_price <= 0:
            return 0.0
        return (self.current_price - self.entry_price) / self.entry_price

    @property
    def contract_key(self) -> str:
        return f"{self.symbol}:{self.expiration_date}:{self.strike:.2f}:{self.option_type}"


@dataclass(slots=True)
class ExitSignal:
    should_exit: bool
    reason: ExitReason | None
    trigger_value: float | None
    threshold_value: float | None
    detail: str = ""


@dataclass(slots=True)
class TradeRecord:
    timestamp: datetime
    action: Action
    symbol: str
    option_type: Side
    expiration_date: str
    strike: float
    quantity: int
    order_price: float
    mark_price: float
    underlying_price: float
    pnl_pct: float
    reason: str
    order_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
