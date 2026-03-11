from __future__ import annotations

import os
from typing import Any

from .base import BrokerAPI


class RobinhoodBroker(BrokerAPI):
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self._rh = self._load_client()

    @staticmethod
    def _load_client():
        try:
            import robin_stocks.robinhood as rh  # type: ignore
        except ImportError as exc:
            raise RuntimeError("robin-stocks is not installed. Run: pip install -r requirements.txt") from exc
        return rh

    def authenticate(self) -> None:
        username = os.getenv("ROBINHOOD_USERNAME")
        password = os.getenv("ROBINHOOD_PASSWORD")
        mfa_code = os.getenv("ROBINHOOD_MFA_CODE")
        if not username or not password:
            raise RuntimeError("ROBINHOOD_USERNAME and ROBINHOOD_PASSWORD env vars are required.")

        self._rh.login(
            username=username,
            password=password,
            mfa_code=mfa_code,
            store_session=True,
        )

    def get_buying_power(self) -> float:
        value = self._rh.load_account_profile(info="buying_power")
        return float(value or 0.0)

    def get_latest_price(self, symbol: str) -> float:
        prices = self._rh.get_latest_price(symbol)
        if not prices:
            return 0.0
        return float(prices[0] or 0.0)

    def get_historicals(self, symbol: str, span: str = "month", interval: str = "day") -> list[dict[str, Any]]:
        rows = self._rh.get_stock_historicals(symbol, interval=interval, span=span, bounds="regular")
        return rows or []

    def find_tradable_options(self, symbol: str, expiration_date: str | None = None) -> list[dict[str, Any]]:
        rows = self._rh.find_tradable_options(symbol, expirationDate=expiration_date)
        return rows or []

    def get_option_market_data(
        self, symbol: str, expiration_date: str, strike: float, option_type: str
    ) -> dict[str, Any]:
        data = self._rh.get_option_market_data(
            inputSymbols=symbol,
            expirationDate=expiration_date,
            strikePrice=str(strike),
            optionType=option_type,
        )
        if isinstance(data, list):
            return data[0] if data else {}
        return data or {}

    def get_option_profitability(
        self,
        symbol: str,
        expiration_date: str | None = None,
        strike: float | None = None,
        option_type: str | None = None,
        type_profit: str = "chance_of_profit_long",
    ) -> list[dict[str, Any]]:
        rows = self._rh.find_options_by_specific_profitability(
            inputSymbols=symbol,
            expirationDate=expiration_date,
            strikePrice=None if strike is None else str(strike),
            optionType=option_type,
            typeProfit=type_profit,
            profitFloor=0.0,
            profitCeiling=1.0,
        )
        return rows or []

    def get_open_option_positions(self) -> list[dict[str, Any]]:
        rows = self._rh.get_open_option_positions()
        return rows or []

    def get_option_instrument_data_by_id(self, option_id: str) -> dict[str, Any]:
        return self._rh.get_option_instrument_data_by_id(option_id) or {}

    def get_option_market_data_by_id(self, option_id: str) -> dict[str, Any]:
        data = self._rh.get_option_market_data_by_id(option_id)
        if isinstance(data, list):
            return data[0] if data else {}
        return data or {}

    def order_buy_option_limit(
        self,
        symbol: str,
        quantity: int,
        expiration_date: str,
        strike: float,
        option_type: str,
        price: float,
    ) -> dict[str, Any]:
        if not self.config.get("execution", {}).get("use_live_orders", False):
            return {
                "dry_run": True,
                "side": "buy_to_open",
                "symbol": symbol,
                "quantity": quantity,
                "expiration_date": expiration_date,
                "strike": strike,
                "option_type": option_type,
                "price": price,
            }
        return self._rh.order_buy_option_limit(
            positionEffect="open",
            creditOrDebit="debit",
            price=round(price, 2),
            symbol=symbol,
            quantity=quantity,
            expirationDate=expiration_date,
            strike=str(strike),
            optionType=option_type,
        )

    def order_sell_option_limit(
        self,
        symbol: str,
        quantity: int,
        expiration_date: str,
        strike: float,
        option_type: str,
        price: float,
    ) -> dict[str, Any]:
        if not self.config.get("execution", {}).get("use_live_orders", False):
            return {
                "dry_run": True,
                "side": "sell_to_close",
                "symbol": symbol,
                "quantity": quantity,
                "expiration_date": expiration_date,
                "strike": strike,
                "option_type": option_type,
                "price": price,
            }
        return self._rh.order_sell_option_limit(
            positionEffect="close",
            creditOrDebit="debit",
            price=round(price, 2),
            symbol=symbol,
            quantity=quantity,
            expirationDate=expiration_date,
            strike=str(strike),
            optionType=option_type,
        )

    def get_day_trades(self) -> list[dict[str, Any]]:
        rows = self._rh.get_day_trades()
        return rows or []
