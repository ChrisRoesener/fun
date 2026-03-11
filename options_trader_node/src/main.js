import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import YAML from "js-yaml";
import { RobinhoodBroker } from "./broker/robinhood.js";
import { PositionManager } from "./position/manager.js";
import { TradeLogger } from "./position/tradeLog.js";
import { OptionScanner } from "./scanner/optionScanner.js";
import { momentumDirection } from "./strategy/signals.js";
import { isUsMarketOpenNow } from "./utils/marketHours.js";
import { nowIso } from "./models/types.js";

async function loadConfig(path) {
  const raw = await readFile(path, "utf-8");
  return YAML.load(raw);
}

function computePositionQuantity(candidatePrice, buyingPower, maxPositionPct) {
  if (candidatePrice <= 0) return 0;
  const maxDollars = Math.max(buyingPower * maxPositionPct, 0);
  const contractCost = candidatePrice * 100;
  if (contractCost <= 0) return 0;
  return Math.floor(maxDollars / contractCost);
}

async function buildRuntime(configPath) {
  const config = await loadConfig(configPath);
  const broker = new RobinhoodBroker(config);
  await broker.authenticate();
  const tradeLogger = new TradeLogger(config.logging?.tradeLogPath ?? "trade_log.csv");
  return { config, broker, tradeLogger };
}

async function commandScan(symbol, opts) {
  const { config, broker, tradeLogger } = await buildRuntime(opts.config);
  const scanner = new OptionScanner(broker, config);

  let direction = opts.direction;
  if (direction === "auto") {
    const candles = await broker.getHistoricals(symbol, { span: "month", interval: "day" });
    direction = momentumDirection(
      candles,
      Number(config.strategy?.shortLookbackDays ?? 5),
      Number(config.strategy?.longLookbackDays ?? 20),
    );
    if (direction === "neutral") direction = "neutral";
  }

  const candidates = await scanner.scan(symbol.toUpperCase(), direction);
  if (candidates.length === 0) {
    console.log("No candidates passed filters.");
    return;
  }

  console.log(`Top candidates for ${symbol.toUpperCase()}:`);
  candidates.forEach((c, i) => {
    console.log(
      `[${i + 1}] ${c.optionType.toUpperCase()} ${c.strike.toFixed(2)} ${c.expirationDate} ` +
        `DTE=${c.dte} Mid=${c.mid.toFixed(2)} Delta=${c.delta.toFixed(3)} ` +
        `Theta=${c.theta.toFixed(4)} IV=${c.impliedVolatility.toFixed(3)} ` +
        `POP=${c.probabilityLong.toFixed(3)} Score=${c.score.toFixed(3)}`,
    );
  });

  if (opts.noConfirm) return;

  const rl = createInterface({ input, output });
  try {
    const selectedRaw = (await rl.question("Enter candidate number to buy (or press Enter to skip): ")).trim();
    if (!selectedRaw) {
      console.log("Skipped.");
      return;
    }
    const idx = Number.parseInt(selectedRaw, 10) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= candidates.length) {
      console.log("Invalid selection.");
      return;
    }
    const c = candidates[idx];
    const buyingPower = await broker.getBuyingPower();
    const quantity =
      Number(opts.quantity || 0) ||
      computePositionQuantity(c.mid, buyingPower, Number(config.risk?.maxPositionPct ?? 0.03));
    if (quantity <= 0) {
      console.log("Quantity resolved to zero.");
      return;
    }

    const confirm = (
      await rl.question(
        `Buy ${quantity}x ${c.symbol} ${c.optionType} ${c.strike.toFixed(2)} ${c.expirationDate} at ${c.mid.toFixed(
          2,
        )}? (y/N): `,
      )
    )
      .trim()
      .toLowerCase();
    if (confirm !== "y") {
      console.log("Order canceled.");
      return;
    }

    const result = await broker.orderBuyOptionLimit({
      symbol: c.symbol,
      quantity,
      expirationDate: c.expirationDate,
      strike: c.strike,
      optionType: c.optionType,
      price: c.mid,
    });
    console.log("Order response:", result);

    await tradeLogger.append({
      timestamp: nowIso(),
      action: "buy_to_open",
      symbol: c.symbol,
      optionType: c.optionType,
      expirationDate: c.expirationDate,
      strike: c.strike,
      quantity,
      orderPrice: c.mid,
      markPrice: c.mark,
      underlyingPrice: 0,
      pnlPct: 0,
      reason: "manual_scan_confirmation",
      orderId: result.id ?? null,
      metadata: { candidateScore: c.score, result },
    });
  } finally {
    rl.close();
  }
}

async function commandMonitor(opts) {
  const { config, broker, tradeLogger } = await buildRuntime(opts.config);
  const manager = new PositionManager(broker, config, tradeLogger);
  const pollIntervalSec = Number(config.monitor?.pollIntervalSec ?? 60);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (opts.requireMarketHours && !isUsMarketOpenNow()) {
      console.log("Market closed. Waiting...");
    } else {
      const decisions = await manager.runOnce();
      for (const { position, signal } of decisions) {
        const mode = signal.shouldExit ? "EXIT" : "HOLD";
        console.log(
          `${mode} ${position.symbol} ${position.optionType} ${position.strike.toFixed(2)} ${position.expirationDate} ` +
            `pnl=${(position.unrealizedPct * 100).toFixed(2)}% reason=${signal.reason ?? "-"}`,
        );
      }
    }
    if (opts.once) return;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalSec * 1000));
  }
}

async function commandStatus(opts) {
  const { config, broker } = await buildRuntime(opts.config);
  const manager = new PositionManager(broker, config, null);
  const positions = await manager.fetchPositions();
  const buyingPower = await broker.getBuyingPower();
  const dayTrades = await broker.getDayTrades();

  console.log(`Buying power: $${buyingPower.toFixed(2)}`);
  console.log(`Day trades (recent): ${dayTrades.length}`);
  console.log(`Open option positions: ${positions.length}`);
  positions.forEach((p) => {
    console.log(
      `- ${p.symbol} ${p.optionType} ${p.strike.toFixed(2)} ${p.expirationDate} ` +
        `qty=${p.quantity} pnl=${(p.unrealizedPct * 100).toFixed(2)}% dte=${p.dteRemaining}`,
    );
  });
}

const program = new Command();
program.name("options-trader-node").description("Node.js options trading assistant");
program.option("-c, --config <path>", "Path to config file", "config.yaml");

program
  .command("scan")
  .argument("<symbol>", "Underlying symbol (e.g. MSFT)")
  .option("--direction <direction>", "auto | bullish | bearish | neutral", "auto")
  .option("--quantity <number>", "Manual quantity override", "0")
  .option("--no-confirm", "Print candidates only")
  .action(async (symbol, cmd) => {
    const root = program.opts();
    await commandScan(symbol, { ...cmd, ...root });
  });

program
  .command("monitor")
  .option("--once", "Run one loop only")
  .option("--require-market-hours", "Only evaluate during market hours")
  .action(async (cmd) => {
    const root = program.opts();
    await commandMonitor({ ...cmd, ...root });
  });

program.command("status").action(async () => {
  const root = program.opts();
  await commandStatus(root);
});

program.parseAsync(process.argv).catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
