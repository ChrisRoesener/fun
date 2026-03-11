from __future__ import annotations

from models.types import ExitSignal, Position


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def update_high_water(position: Position) -> None:
    position.high_water_price = max(position.high_water_price, position.current_price)
    position.high_water_unrealized_pct = max(position.high_water_unrealized_pct, position.unrealized_pct)


def evaluate_trailing_stop(position: Position, risk_config: dict[str, float]) -> ExitSignal:
    update_high_water(position)

    activation = float(risk_config.get("trail_activation_pct", 0.15))
    if position.high_water_unrealized_pct < activation:
        return ExitSignal(False, None, position.unrealized_pct, activation, "Trailing stop not activated.")

    base_trail = float(risk_config.get("base_trail_pct", 0.20))
    dte_scale = (position.dte_remaining / max(position.dte_initial, 1)) if position.dte_initial > 0 else 1.0

    iv = max(position.implied_volatility, 0.01)
    iv_ref = 0.40
    raw_vol_scale = iv / iv_ref
    vol_scale = _clamp(
        raw_vol_scale,
        float(risk_config.get("volatility_scale_min", 0.75)),
        float(risk_config.get("volatility_scale_max", 1.25)),
    )

    trail_pct = max(0.01, base_trail * dte_scale * vol_scale)
    stop_price = position.high_water_price * (1.0 - trail_pct)

    if position.current_price <= stop_price:
        return ExitSignal(
            should_exit=True,
            reason="trailing_stop",
            trigger_value=position.current_price,
            threshold_value=stop_price,
            detail="Trailing stop hit after profit activation.",
        )

    return ExitSignal(
        should_exit=False,
        reason=None,
        trigger_value=position.current_price,
        threshold_value=stop_price,
        detail="Trailing stop active.",
    )
