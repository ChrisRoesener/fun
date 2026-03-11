from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from broker.robinhood import RobinhoodBroker
from models.types import TradeRecord
from position.manager import PositionManager
from position.trade_log import TradeLogger
from scanner.option_scanner import OptionScanner
from strategy.signals import momentum_direction
from utils.market_hours import is_us_market_open_now


def load_config(path: str) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as fp:
        return yaml.safe_load(fp) or {}


def build_runtime(config_path: str) -> tuple[dict[str, Any], RobinhoodBroker, TradeLogger]:
    config = load_config(config_path)
    broker = RobinhoodBroker(config)
    broker.authenticate()
    trade_log_path = config.get("logging", {}).get("trade_log_path", "trade_log.csv")
    logger = TradeLogger(trade_log_path)
    return config, broker, logger


def compute_position_quantity(candidate_price: float, buying_power: float, max_position_pct: float) -> int:
    if candidate_price <= 0:
        return 0
    max_dollars = max(buying_power * max_position_pct, 0.0)
    contract_cost = candidate_price * 100
    if contract_cost <= 0:
        return 0
    return max(int(max_dollars // contract_cost), 0)


def command_scan(args: argparse.Namespace) -> int:
    config, broker, logger = build_runtime(args.config)
    direction = args.direction
    if direction == "auto":
        strategy_cfg = config.get("strategy", {})
        direction = momentum_direction(
            broker,
            args.symbol,
            short_lookback_days=int(strategy_cfg.get("short_lookback_days", 5)),
            long_lookback_days=int(strategy_cfg.get("long_lookback_days", 20)),
        )
        if direction == "neutral":
            print("Signal is neutral; defaulting to scanning both directions.")

    scanner = OptionScanner(broker, config)
    scan_direction = "neutral" if direction == "auto" else direction
    candidates = scanner.scan(args.symbol.upper(), scan_direction)
    if not candidates:
        print("No candidates passed filters.")
        return 0

    print(f"Top candidates for {args.symbol.upper()}:")
    for idx, c in enumerate(candidates, start=1):
        print(
            f"[{idx}] {c.option_type.upper()} {c.strike:.2f} {c.expiration_date} "
            f"DTE={c.dte} Mid={c.mid:.2f} Delta={c.delta:.3f} Theta={c.theta:.4f} "
            f"IV={c.implied_volatility:.3f} POP={c.probability_long:.3f} Score={c.score:.3f}"
        )

    if args.no_confirm:
        return 0

    choice_raw = input("Enter candidate number to buy (or press Enter to skip): ").strip()
    if not choice_raw:
        print("Skipped.")
        return 0

    try:
        selected_idx = int(choice_raw) - 1
        candidate = candidates[selected_idx]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return 1

    buying_power = broker.get_buying_power()
    max_position_pct = float(config.get("risk", {}).get("max_position_pct", 0.03))
    quantity = args.quantity or compute_position_quantity(candidate.mid, buying_power, max_position_pct)
    if quantity <= 0:
        print("Quantity resolved to zero. Increase risk cap or choose cheaper option.")
        return 1

    confirmation = input(
        f"Buy {quantity}x {candidate.symbol} {candidate.option_type} {candidate.strike:.2f} {candidate.expiration_date} "
        f"at {candidate.mid:.2f}? (y/N): "
    ).strip()
    if confirmation.lower() != "y":
        print("Order cancelled by user.")
        return 0

    result = broker.order_buy_option_limit(
        symbol=candidate.symbol,
        quantity=quantity,
        expiration_date=candidate.expiration_date,
        strike=candidate.strike,
        option_type=candidate.option_type,
        price=candidate.mid,
    )
    print(f"Order response: {result}")

    logger.append(
        TradeRecord(
            timestamp=datetime.now(tz=timezone.utc),
            action="buy_to_open",
            symbol=candidate.symbol,
            option_type=candidate.option_type,
            expiration_date=candidate.expiration_date,
            strike=candidate.strike,
            quantity=quantity,
            order_price=candidate.mid,
            mark_price=candidate.mark,
            underlying_price=float(candidate.metadata.get("underlying_price", 0.0)),
            pnl_pct=0.0,
            reason="manual_scan_confirmation",
            order_id=str(result.get("id")) if isinstance(result, dict) and result.get("id") else None,
            metadata={"candidate_score": candidate.score, "result": result},
        )
    )
    return 0


def command_monitor(args: argparse.Namespace) -> int:
    config, broker, logger = build_runtime(args.config)
    manager = PositionManager(broker, config, trade_logger=logger)
    poll_seconds = int(config.get("monitor", {}).get("poll_interval_sec", 60))

    while True:
        if args.require_market_hours and not is_us_market_open_now():
            print("Market closed. Waiting...")
        else:
            decisions = manager.run_once()
            for position, signal in decisions:
                status = "EXIT" if signal.should_exit else "HOLD"
                print(
                    f"{status} {position.symbol} {position.option_type} {position.strike:.2f} "
                    f"{position.expiration_date} pnl={position.unrealized_pct:.2%} reason={signal.reason or '-'}"
                )

        if args.once:
            return 0
        time.sleep(poll_seconds)


def command_status(args: argparse.Namespace) -> int:
    config, broker, _ = build_runtime(args.config)
    manager = PositionManager(broker, config)
    positions = manager.fetch_positions()
    print(f"Buying power: ${broker.get_buying_power():,.2f}")
    print(f"Day trades (recent): {len(broker.get_day_trades())}")
    print(f"Open option positions: {len(positions)}")
    for p in positions:
        print(
            f"- {p.symbol} {p.option_type} {p.strike:.2f} {p.expiration_date} "
            f"qty={p.quantity} pnl={p.unrealized_pct:.2%} dte={p.dte_remaining}"
        )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Options Trading Bot")
    parser.add_argument("--config", default="config.yaml", help="Path to config YAML.")
    sub = parser.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan", help="Scan and optionally place a buy order.")
    scan.add_argument("symbol", help="Underlying symbol (e.g. MSFT).")
    scan.add_argument(
        "--direction",
        choices=["auto", "bullish", "bearish", "neutral"],
        default="auto",
        help="Directional bias for candidate selection.",
    )
    scan.add_argument("--quantity", type=int, default=0, help="Override quantity.")
    scan.add_argument("--no-confirm", action="store_true", help="Only print candidates, do not ask to place order.")
    scan.set_defaults(func=command_scan)

    monitor = sub.add_parser("monitor", help="Monitor open positions and auto-exit by rules.")
    monitor.add_argument("--once", action="store_true", help="Run one iteration and exit.")
    monitor.add_argument(
        "--require-market-hours",
        action="store_true",
        help="Only evaluate positions during US market hours.",
    )
    monitor.set_defaults(func=command_monitor)

    status = sub.add_parser("status", help="Show account and position summary.")
    status.set_defaults(func=command_status)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
