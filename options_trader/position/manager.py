from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import urlparse

from broker.base import BrokerAPI
from models.types import ExitSignal, Position, TradeRecord
from risk.stop_loss import evaluate_stop_loss
from risk.trailing_stop import evaluate_trailing_stop
from scanner.filters import dte_from_expiration, parse_float, parse_int
from utils.greeks import average_true_range


class PositionManager:
    def __init__(self, broker: BrokerAPI, config: dict[str, Any], trade_logger: Any | None = None):
        self.broker = broker
        self.config = config
        self.risk_cfg = config.get("risk", {})
        self.trade_logger = trade_logger
        self._state: dict[str, Position] = {}

    def fetch_positions(self) -> list[Position]:
        raw_positions = self.broker.get_open_option_positions()
        positions: list[Position] = []
        for row in raw_positions:
            position = self._hydrate_position(row)
            if not position:
                continue

            prev = self._state.get(position.contract_key)
            if prev:
                position.high_water_price = max(prev.high_water_price, position.current_price)
                position.high_water_unrealized_pct = max(prev.high_water_unrealized_pct, position.unrealized_pct)
                position.opened_at = prev.opened_at

            self._state[position.contract_key] = position
            positions.append(position)
        return positions

    def evaluate_and_maybe_exit(self, position: Position) -> ExitSignal:
        mandatory_dte = int(self.risk_cfg.get("mandatory_exit_dte", 2))
        if position.dte_remaining <= mandatory_dte:
            signal = ExitSignal(True, "mandatory_dte_exit", position.dte_remaining, mandatory_dte, "Mandatory DTE exit.")
            self._execute_exit(position, signal)
            return signal

        stop_signal = evaluate_stop_loss(position, self.risk_cfg)
        if stop_signal.should_exit:
            self._execute_exit(position, stop_signal)
            return stop_signal

        trail_signal = evaluate_trailing_stop(position, self.risk_cfg)
        if trail_signal.should_exit:
            self._execute_exit(position, trail_signal)
            return trail_signal

        self._state[position.contract_key] = replace(position)
        return ExitSignal(False, None, None, None, "No exit triggered.")

    def run_once(self) -> list[tuple[Position, ExitSignal]]:
        decisions: list[tuple[Position, ExitSignal]] = []
        for position in self.fetch_positions():
            signal = self.evaluate_and_maybe_exit(position)
            decisions.append((position, signal))
        return decisions

    def _execute_exit(self, position: Position, signal: ExitSignal) -> None:
        price = max(round(position.current_price, 2), 0.01)
        result = self.broker.order_sell_option_limit(
            symbol=position.symbol,
            quantity=position.quantity,
            expiration_date=position.expiration_date,
            strike=position.strike,
            option_type=position.option_type,
            price=price,
        )

        if self.trade_logger:
            record = TradeRecord(
                timestamp=datetime.now(tz=timezone.utc),
                action="sell_to_close",
                symbol=position.symbol,
                option_type=position.option_type,
                expiration_date=position.expiration_date,
                strike=position.strike,
                quantity=position.quantity,
                order_price=price,
                mark_price=position.current_price,
                underlying_price=position.current_underlying_price,
                pnl_pct=position.unrealized_pct,
                reason=signal.reason or "unknown",
                order_id=str(result.get("id")) if isinstance(result, dict) and result.get("id") else None,
                metadata={"result": result, "detail": signal.detail},
            )
            self.trade_logger.append(record)

    def _hydrate_position(self, row: dict[str, Any]) -> Position | None:
        option_id = _extract_option_id(row)
        if not option_id:
            return None

        instrument = self.broker.get_option_instrument_data_by_id(option_id)
        market = self.broker.get_option_market_data_by_id(option_id)

        symbol = str(instrument.get("chain_symbol") or instrument.get("symbol") or "").upper()
        option_type = str(instrument.get("type", "")).lower()
        expiration_date = str(instrument.get("expiration_date", ""))
        strike = parse_float(instrument.get("strike_price"))
        quantity = parse_int(row.get("quantity"))
        if not symbol or option_type not in ("call", "put") or not expiration_date or strike <= 0 or quantity <= 0:
            return None

        entry_price = parse_float(row.get("average_price") or row.get("average_buy_price"))
        current_price = parse_float(market.get("adjusted_mark_price") or market.get("mark_price"))
        if current_price <= 0:
            current_price = parse_float(market.get("bid_price") or market.get("ask_price"))

        underlying_price = self.broker.get_latest_price(symbol)
        dte_remaining = dte_from_expiration(expiration_date)
        opened_at = _parse_timestamp(row.get("created_at") or row.get("updated_at"))
        opened_date = opened_at.date() if opened_at else date.today()
        dte_initial = max(dte_from_expiration(expiration_date, today=opened_date), dte_remaining)
        delta = parse_float(market.get("delta"))
        theta = parse_float(market.get("theta"))
        iv = parse_float(market.get("implied_volatility"))
        atr = average_true_range(self.broker.get_historicals(symbol, span="month", interval="day"), period=14)

        return Position(
            symbol=symbol,
            option_type=option_type,  # type: ignore[arg-type]
            expiration_date=expiration_date,
            strike=strike,
            quantity=quantity,
            entry_price=entry_price,
            entry_underlying_price=underlying_price,
            current_price=current_price,
            current_underlying_price=underlying_price,
            dte_initial=dte_initial,
            dte_remaining=dte_remaining,
            delta=delta,
            theta=theta,
            implied_volatility=iv,
            atr=atr,
            high_water_price=current_price,
            high_water_unrealized_pct=max((current_price - entry_price) / entry_price if entry_price > 0 else 0.0, 0.0),
            opened_at=opened_at or datetime.now(tz=timezone.utc),
            external_id=option_id,
        )


def _extract_option_id(row: dict[str, Any]) -> str | None:
    direct = row.get("option_id")
    if isinstance(direct, str) and direct:
        return direct

    url = row.get("option") or row.get("option_instrument")
    if not isinstance(url, str) or not url:
        return None
    parsed = urlparse(url)
    tail = parsed.path.rstrip("/").split("/")[-1]
    return tail or None


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    iso = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(iso)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None
