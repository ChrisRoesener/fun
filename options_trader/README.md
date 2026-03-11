# Options Trading Bot

Python assistant for scanning and managing Robinhood options trades with strict risk controls.

## What It Does

- Scans near-term option contracts for a symbol (for example `MSFT`)
- Filters for liquidity, DTE, delta, spread, and probability fields
- Supports manual confirmation before entries (semi-automated workflow)
- Monitors open positions and exits by:
  - hard stop loss
  - time-decay-adjusted stop
  - adverse underlying ATR move
  - ratcheting trailing stop on winners
  - mandatory DTE exit
- Logs trades to CSV for review

## Important Notes

- This project is provided for educational use.
- Options are high risk; losses can be substantial.
- Start in dry-run mode (`execution.use_live_orders: false`) and validate behavior before any live orders.

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy the sample env file and fill in values:

```bash
cp .env.example .env
```

4. Export env vars into your shell session (or load from `.env` using your preferred tool).

## Environment Variables

The app expects these:

- `ROBINHOOD_USERNAME`
- `ROBINHOOD_PASSWORD`
- `ROBINHOOD_MFA_CODE` (optional, if MFA is enabled)

## Configuration

Main config is in `config.yaml`.

Key sections:

- `scanner`: candidate selection thresholds
- `risk`: stop-loss, trailing-stop, and position sizing controls
- `monitor`: polling interval
- `execution`: dry-run vs live orders
- `logging`: trade log location

## Usage

Run commands from the `options_trader` directory.

Scan and optionally place a manually-confirmed order:

```bash
python main.py scan MSFT
```

Scan with explicit directional bias:

```bash
python main.py scan MSFT --direction bullish
python main.py scan MSFT --direction bearish
```

View status:

```bash
python main.py status
```

Run monitor loop one cycle:

```bash
python main.py monitor --once
```

Run monitor continuously during market hours only:

```bash
python main.py monitor --require-market-hours
```

## Recommended First Run

1. Keep `execution.use_live_orders: false`.
2. Run `scan` and confirm candidate formatting looks right.
3. Run `status` and `monitor --once` to verify position parsing and rule evaluation.
4. Only then consider enabling live execution.
