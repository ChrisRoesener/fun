# Options Trading Bot (Node.js)

Comparable Node.js version of the options scanner/monitor program, built for a semi-automated workflow:

- scan option candidates for an underlying (e.g. `MSFT`)
- manually confirm entries
- automatically monitor open positions
- enforce stop-loss and trailing-stop exits
- log trade actions to CSV

## Status of Broker Integration

This project includes a `RobinhoodBroker` adapter in `src/broker/robinhood.js`, but **live Robinhood endpoints are placeholders**.

Why: Robinhood has no official public trading API. The adapter is structured so you can plug in your preferred private endpoint package/workflow without changing scanner/risk logic.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env
```

3. Fill in credentials in `.env`.

4. Keep dry-run mode on:

- `config.yaml` -> `execution.useLiveOrders: false`
- `.env` -> `USE_LIVE_ORDERS=false`

5. Run:

```bash
npm run scan -- MSFT
npm run status
npm run monitor -- --once
```

## Commands

- `node src/main.js scan MSFT`
- `node src/main.js status`
- `node src/main.js monitor --once`
- `node src/main.js monitor --require-market-hours`

## Project Structure

```
options_trader_node/
  config.yaml
  .env.example
  src/
    main.js
    broker/
      base.js
      robinhood.js
    scanner/
      filters.js
      optionScanner.js
    strategy/
      signals.js
      scoring.js
    risk/
      stopLoss.js
      trailingStop.js
    position/
      manager.js
      tradeLog.js
    models/
      types.js
    utils/
      greeks.js
      marketHours.js
```

## Safety Notes

- This is for educational use and workflow automation.
- Options carry substantial risk.
- Validate with dry-run logging before enabling any live execution path.
