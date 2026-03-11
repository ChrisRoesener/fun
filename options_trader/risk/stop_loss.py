from __future__ import annotations

from models.types import ExitSignal, Position


def hard_stop_threshold(config: dict[str, float], position: Position) -> tuple[float, float]:
    base = float(config.get("hard_stop_pct", 0.30))
    floor = float(config.get("hard_stop_floor_pct", 0.10))
    if position.dte_initial <= 0:
        return base, base
    time_scaled = base * (position.dte_remaining / max(position.dte_initial, 1))
    adjusted = max(floor, time_scaled)
    return base, adjusted


def evaluate_stop_loss(position: Position, risk_config: dict[str, float]) -> ExitSignal:
    current_loss = -position.unrealized_pct
    if current_loss <= 0:
        return ExitSignal(False, None, None, None)

    base_threshold, adjusted_threshold = hard_stop_threshold(risk_config, position)
    if current_loss >= base_threshold:
        return ExitSignal(
            should_exit=True,
            reason="hard_stop",
            trigger_value=current_loss,
            threshold_value=base_threshold,
            detail="Base hard loss threshold breached.",
        )

    if adjusted_threshold < base_threshold and current_loss >= adjusted_threshold:
        return ExitSignal(
            should_exit=True,
            reason="time_decay_stop",
            trigger_value=current_loss,
            threshold_value=adjusted_threshold,
            detail="Time-decay-adjusted loss threshold breached.",
        )

    atr_multiple = float(risk_config.get("atr_multiple_stop", 1.0))
    atr = max(position.atr, 0.0)
    if atr > 0:
        adverse_move = _adverse_underlying_move(position)
        adverse_threshold = atr * atr_multiple
        if adverse_move >= adverse_threshold:
            return ExitSignal(
                should_exit=True,
                reason="underlying_atr_stop",
                trigger_value=adverse_move,
                threshold_value=adverse_threshold,
                detail="Underlying moved adversely by ATR threshold while position is losing.",
            )

    return ExitSignal(False, None, current_loss, adjusted_threshold)


def _adverse_underlying_move(position: Position) -> float:
    if position.option_type == "call":
        return max(position.entry_underlying_price - position.current_underlying_price, 0.0)
    return max(position.current_underlying_price - position.entry_underlying_price, 0.0)
