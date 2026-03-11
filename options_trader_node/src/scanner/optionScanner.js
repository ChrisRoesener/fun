import { scoreCandidate } from "../strategy/scoring.js";
import { dteFromExpiration, passDelta, spreadPct, toFloat, toInt } from "./filters.js";

export class OptionScanner {
  constructor(broker, config) {
    this.broker = broker;
    this.cfg = config.scanner ?? {};
  }

  async scan(symbol, direction = "neutral") {
    const options = await this.broker.findTradableOptions(symbol);
    const profitabilityRows = await this.broker.getOptionProfitability(symbol);
    const popLookup = new Map(
      profitabilityRows.map((r) => [
        `${r.expirationDate}|${Number(r.strikePrice).toFixed(2)}|${String(r.type).toLowerCase()}`,
        toFloat(r.chanceOfProfitLong, 0),
      ]),
    );

    const candidates = [];
    for (const o of options) {
      const optionType = String(o.type ?? "").toLowerCase();
      if (!["call", "put"].includes(optionType)) continue;
      if (direction === "bullish" && optionType !== "call") continue;
      if (direction === "bearish" && optionType !== "put") continue;

      const expirationDate = String(o.expirationDate ?? "");
      const strike = toFloat(o.strikePrice, 0);
      if (!expirationDate || strike <= 0) continue;

      const dte = dteFromExpiration(expirationDate);
      if (dte < (this.cfg.dteMin ?? 7) || dte > (this.cfg.dteMax ?? 30)) continue;

      const market = await this.broker.getOptionMarketData(symbol, expirationDate, strike, optionType);
      const bid = toFloat(market.bidPrice);
      const ask = toFloat(market.askPrice);
      const mark = toFloat(market.adjustedMarkPrice ?? market.markPrice);
      const mid = bid + ask > 0 ? (bid + ask) / 2 : mark;
      const delta = toFloat(market.delta);
      const theta = toFloat(market.theta);
      const openInterest = toInt(market.openInterest);
      const impliedVolatility = toFloat(market.impliedVolatility);
      const spread = spreadPct(bid, ask);
      const key = `${expirationDate}|${strike.toFixed(2)}|${optionType}`;
      const probabilityLong = toFloat(market.chanceOfProfitLong ?? popLookup.get(key), 0);

      if (!passDelta(optionType, delta, this.cfg.deltaMin ?? 0.3, this.cfg.deltaMax ?? 0.55)) continue;
      if (openInterest < (this.cfg.minOpenInterest ?? 100)) continue;
      if (spread > (this.cfg.maxSpreadPct ?? 0.1)) continue;
      if (probabilityLong < (this.cfg.minProbabilityLong ?? 0.35)) continue;

      const score = scoreCandidate({
        optionType,
        delta,
        spreadPctValue: spread,
        impliedVolatility,
        probabilityLong,
        deltaMin: this.cfg.deltaMin ?? 0.3,
        deltaMax: this.cfg.deltaMax ?? 0.55,
        maxSpread: this.cfg.maxSpreadPct ?? 0.1,
      });

      candidates.push({
        symbol,
        optionType,
        expirationDate,
        strike,
        dte,
        bid,
        ask,
        mark,
        mid,
        spreadPct: spread,
        openInterest,
        impliedVolatility,
        delta,
        theta,
        probabilityLong,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, this.cfg.maxCandidates ?? 5);
  }
}
