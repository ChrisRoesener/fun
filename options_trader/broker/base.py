from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BrokerAPI(ABC):
    @abstractmethod
    def authenticate(self) -> None:
        """Authenticate and initialize session state."""

    @abstractmethod
    def get_buying_power(self) -> float:
        """Return account buying power."""

    @abstractmethod
    def get_latest_price(self, symbol: str) -> float:
        """Return latest underlying price."""

    @abstractmethod
    def get_historicals(self, symbol: str, span: str = "month", interval: str = "day") -> list[dict[str, Any]]:
        """Return OHLC historical candles for the underlying."""

    @abstractmethod
    def find_tradable_options(self, symbol: str, expiration_date: str | None = None) -> list[dict[str, Any]]:
        """Return tradable option instruments."""

    @abstractmethod
    def get_option_market_data(
        self, symbol: str, expiration_date: str, strike: float, option_type: str
    ) -> dict[str, Any]:
        """Return option market data, including Greeks and probability fields."""

    @abstractmethod
    def get_option_profitability(
        self,
        symbol: str,
        expiration_date: str | None = None,
        strike: float | None = None,
        option_type: str | None = None,
        type_profit: str = "chance_of_profit_long",
    ) -> list[dict[str, Any]]:
        """Return options filtered by Robinhood profitability endpoint."""

    @abstractmethod
    def get_open_option_positions(self) -> list[dict[str, Any]]:
        """Return currently open option positions."""

    @abstractmethod
    def get_option_instrument_data_by_id(self, option_id: str) -> dict[str, Any]:
        """Return option instrument metadata for an instrument id."""

    @abstractmethod
    def get_option_market_data_by_id(self, option_id: str) -> dict[str, Any]:
        """Return option market data for an instrument id."""

    @abstractmethod
    def order_buy_option_limit(
        self,
        symbol: str,
        quantity: int,
        expiration_date: str,
        strike: float,
        option_type: str,
        price: float,
    ) -> dict[str, Any]:
        """Submit buy-to-open limit order for an option."""

    @abstractmethod
    def order_sell_option_limit(
        self,
        symbol: str,
        quantity: int,
        expiration_date: str,
        strike: float,
        option_type: str,
        price: float,
    ) -> dict[str, Any]:
        """Submit sell-to-close limit order for an option."""

    @abstractmethod
    def get_day_trades(self) -> list[dict[str, Any]]:
        """Return recent day-trade records."""
