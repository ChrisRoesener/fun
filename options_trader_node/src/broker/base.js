export class BrokerBase {
  async authenticate() {
    throw new Error("authenticate() not implemented");
  }

  async getBuyingPower() {
    throw new Error("getBuyingPower() not implemented");
  }

  async getLatestPrice(_symbol) {
    throw new Error("getLatestPrice() not implemented");
  }

  async getHistoricals(_symbol, _opts = {}) {
    throw new Error("getHistoricals() not implemented");
  }

  async findTradableOptions(_symbol, _expirationDate = null) {
    throw new Error("findTradableOptions() not implemented");
  }

  async getOptionMarketData(_symbol, _expirationDate, _strike, _optionType) {
    throw new Error("getOptionMarketData() not implemented");
  }

  async getOptionProfitability(_symbol) {
    throw new Error("getOptionProfitability() not implemented");
  }

  async getOpenOptionPositions() {
    throw new Error("getOpenOptionPositions() not implemented");
  }

  async orderBuyOptionLimit(_params) {
    throw new Error("orderBuyOptionLimit() not implemented");
  }

  async orderSellOptionLimit(_params) {
    throw new Error("orderSellOptionLimit() not implemented");
  }

  async getDayTrades() {
    throw new Error("getDayTrades() not implemented");
  }
}
