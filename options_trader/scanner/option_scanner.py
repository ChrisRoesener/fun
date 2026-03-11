from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from broker.base import BrokerAPI
from models.types import Direction, OptionCandidate
from scanner.filters import (
    dte_from_expiration,
    parse_float,
    parse_int,
    passes_delta,
    passes_dte,
    passes_open_interest,
    passes_spread_pct,
    spread_pct,
)
from strategy.scoring import score_candidate


class OptionScanner:
    def __init__(self, broker: BrokerAPI, config: dict[str, Any]):
        self.broker = broker
        self.config = config
        self.scan_cfg = config.get("scanner", {})

    def scan(self, symbol: str, direction: Direction) -> list[OptionCandidate]:
        underlying_price = self.broker.get_latest_price(symbol)
        options = self.broker.find_tradable_options(symbol)
        profitability_rows = self.broker.get_option_profitability(symbol=symbol)
        prob_lookup = self._build_prob_lookup(profitability_rows)

        candidates: list[OptionCandidate] = []
        for option in options:
            option_type = str(option.get("type", "")).lower()
            if option_type not in ("call", "put"):
                continue

            if direction == "bullish" and option_type != "call":
                continue
            if direction == "bearish" and option_type != "put":
                continue

            expiration_date = str(option.get("expiration_date", ""))
            strike = parse_float(option.get("strike_price"))
            if not expiration_date or strike <= 0:
                continue

            dte = dte_from_expiration(expiration_date)
            if not passes_dte(dte, self.scan_cfg.get("dte_min", 7), self.scan_cfg.get("dte_max", 30)):
                continue

            market = self.broker.get_option_market_data(
                symbol=symbol,
                expiration_date=expiration_date,
                strike=strike,
                option_type=option_type,
            )

            bid = parse_float(market.get("bid_price"))
            ask = parse_float(market.get("ask_price"))
            mark = parse_float(market.get("adjusted_mark_price") or market.get("mark_price"))
            mid = (bid + ask) / 2 if (bid + ask) > 0 else mark
            delta = parse_float(market.get("delta"))
            theta = parse_float(market.get("theta"))
            open_interest = parse_int(market.get("open_interest"))
            iv = parse_float(market.get("implied_volatility"))
            spr = spread_pct(bid, ask)

            if not passes_delta(option_type, delta, self.scan_cfg.get("delta_min", 0.30), self.scan_cfg.get("delta_max", 0.55)):
                continue
            if not passes_open_interest(open_interest, self.scan_cfg.get("min_open_interest", 100)):
                continue
            if not passes_spread_pct(spr, self.scan_cfg.get("max_spread_pct", 0.10)):
                continue

            prob_key = (expiration_date, f"{strike:.2f}", option_type)
            probability = parse_float(
                market.get("chance_of_profit_long") or prob_lookup.get(prob_key, 0.0)
            )
            if probability < self.scan_cfg.get("min_probability_long", 0.35):
                continue

            score = score_candidate(
                option_type=option_type,
                delta=delta,
                spread_pct_value=spr,
                implied_volatility=iv,
                probability_long=probability,
                delta_min=self.scan_cfg.get("delta_min", 0.30),
                delta_max=self.scan_cfg.get("delta_max", 0.55),
                max_spread=self.scan_cfg.get("max_spread_pct", 0.10),
            )

            candidates.append(
                OptionCandidate(
                    symbol=symbol,
                    option_type=option_type,  # type: ignore[arg-type]
                    expiration_date=expiration_date,
                    strike=strike,
                    dte=dte,
                    bid=bid,
                    ask=ask,
                    mark=mark,
                    mid=mid,
                    spread_pct=spr,
                    open_interest=open_interest,
                    implied_volatility=iv,
                    delta=delta,
                    theta=theta,
                    probability_long=probability,
                    score=score,
                    direction=direction,
                    metadata={"underlying_price": underlying_price},
                )
            )

        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates[: self.scan_cfg.get("max_candidates", 5)]

    @staticmethod
    def _build_prob_lookup(rows: Iterable[dict[str, Any]]) -> dict[tuple[str, str, str], float]:
        lookup: dict[tuple[str, str, str], float] = {}
        for row in rows:
            expiration = str(row.get("expiration_date", ""))
            strike = parse_float(row.get("strike_price"))
            option_type = str(row.get("type", "")).lower()
            probability = parse_float(row.get("chance_of_profit_long"))
            if expiration and strike > 0 and option_type in ("call", "put"):
                lookup[(expiration, f"{strike:.2f}", option_type)] = probability
        return lookup
