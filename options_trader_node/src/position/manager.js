import { makeExitSignal, nowIso } from "../models/types.js";
import { evaluateStopLoss } from "../risk/stopLoss.js";
import { evaluateTrailingStop } from "../risk/trailingStop.js";
import { dteFromExpiration, toFloat, toInt } from "../scanner/filters.js";
import { averageTrueRange } from "../utils/greeks.js";

export class PositionManager {
  constructor(broker, config, tradeLogger = null) {
    this.broker = broker;
    this.config = config;
    this.riskCfg = config.risk ?? {};
    this.tradeLogger = tradeLogger;
    this.state = new Map();
  }

  async runOnce() {
    const positions = await this.fetchPositions();
    const decisions = [];
    for (const p of positions) {
      const signal = await this.evaluateAndMaybeExit(p);
      decisions.push({ position: p, signal });
    }
    return decisions;
  }

  async fetchPositions() {
    const raw = await this.broker.getOpenOptionPositions();
    const list = [];

    for (const row of raw) {
      const symbol = String(row.symbol ?? "").toUpperCase();
      const optionType = String(row.optionType ?? row.type ?? "").toLowerCase();
      const expirationDate = String(row.expirationDate ?? "");
      const strike = toFloat(row.strikePrice ?? row.strike);
      const quantity = toInt(row.quantity, 0);
      if (!symbol || !expirationDate || !["call", "put"].includes(optionType) || strike <= 0 || quantity <= 0) {
        continue;
      }

      const currentUnderlyingPrice = await this.broker.getLatestPrice(symbol);
      const dteRemaining = dteFromExpiration(expirationDate);
      const dteInitial = Math.max(toInt(row.dteInitial, dteRemaining), dteRemaining);
      const entryPrice = toFloat(row.entryPrice ?? row.averagePrice, 0);
      const currentPrice = toFloat(row.currentPrice ?? row.markPrice, 0);
      const candles = await this.broker.getHistoricals(symbol, { span: "month", interval: "day" });
      const atr = averageTrueRange(candles, 14);

      const contractKey = `${symbol}:${expirationDate}:${strike.toFixed(2)}:${optionType}`;
      const prior = this.state.get(contractKey);
      const unrealizedPct = entryPrice > 0 ? (currentPrice - entryPrice) / entryPrice : 0;

      const position = {
        symbol,
        optionType,
        expirationDate,
        strike,
        quantity,
        entryPrice,
        entryUnderlyingPrice: toFloat(row.entryUnderlyingPrice ?? currentUnderlyingPrice),
        currentPrice,
        currentUnderlyingPrice,
        dteInitial,
        dteRemaining,
        impliedVolatility: toFloat(row.impliedVolatility, 0.3),
        atr,
        unrealizedPct,
        highWaterPrice: prior ? Math.max(prior.highWaterPrice, currentPrice) : currentPrice,
        highWaterUnrealizedPct: prior ? Math.max(prior.highWaterUnrealizedPct, unrealizedPct) : Math.max(unrealizedPct, 0),
        contractKey,
      };

      this.state.set(contractKey, position);
      list.push(position);
    }
    return list;
  }

  async evaluateAndMaybeExit(position) {
    const mandatoryExitDte = Number(this.riskCfg.mandatoryExitDte ?? 2);
    if (position.dteRemaining <= mandatoryExitDte) {
      const signal = makeExitSignal({
        shouldExit: true,
        reason: "mandatory_dte_exit",
        triggerValue: position.dteRemaining,
        thresholdValue: mandatoryExitDte,
        detail: "Mandatory DTE exit.",
      });
      await this.executeExit(position, signal);
      return signal;
    }

    const stopSignal = evaluateStopLoss(position, this.riskCfg);
    if (stopSignal.shouldExit) {
      await this.executeExit(position, stopSignal);
      return stopSignal;
    }

    const trailSignal = evaluateTrailingStop(position, this.riskCfg);
    if (trailSignal.shouldExit) {
      await this.executeExit(position, trailSignal);
      return trailSignal;
    }

    this.state.set(position.contractKey, position);
    return makeExitSignal({ detail: "No exit trigger." });
  }

  async executeExit(position, signal) {
    const orderPrice = Math.max(Number(position.currentPrice.toFixed(2)), 0.01);
    const result = await this.broker.orderSellOptionLimit({
      symbol: position.symbol,
      quantity: position.quantity,
      expirationDate: position.expirationDate,
      strike: position.strike,
      optionType: position.optionType,
      price: orderPrice,
    });

    if (this.tradeLogger) {
      await this.tradeLogger.append({
        timestamp: nowIso(),
        action: "sell_to_close",
        symbol: position.symbol,
        optionType: position.optionType,
        expirationDate: position.expirationDate,
        strike: position.strike,
        quantity: position.quantity,
        orderPrice,
        markPrice: position.currentPrice,
        underlyingPrice: position.currentUnderlyingPrice,
        pnlPct: position.unrealizedPct,
        reason: signal.reason ?? "unknown",
        orderId: result.id ?? null,
        metadata: { result, detail: signal.detail },
      });
    }
  }
}
