from __future__ import annotations

import csv
import json
from pathlib import Path

from models.types import TradeRecord


class TradeLogger:
    FIELDNAMES = [
        "timestamp",
        "action",
        "symbol",
        "option_type",
        "expiration_date",
        "strike",
        "quantity",
        "order_price",
        "mark_price",
        "underlying_price",
        "pnl_pct",
        "reason",
        "order_id",
        "metadata_json",
    ]

    def __init__(self, path: str):
        self.path = Path(path)
        if not self.path.parent.exists():
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, record: TradeRecord) -> None:
        needs_header = not self.path.exists()
        with self.path.open("a", newline="", encoding="utf-8") as fp:
            writer = csv.DictWriter(fp, fieldnames=self.FIELDNAMES)
            if needs_header:
                writer.writeheader()
            writer.writerow(
                {
                    "timestamp": record.timestamp.isoformat(),
                    "action": record.action,
                    "symbol": record.symbol,
                    "option_type": record.option_type,
                    "expiration_date": record.expiration_date,
                    "strike": f"{record.strike:.2f}",
                    "quantity": record.quantity,
                    "order_price": f"{record.order_price:.4f}",
                    "mark_price": f"{record.mark_price:.4f}",
                    "underlying_price": f"{record.underlying_price:.4f}",
                    "pnl_pct": f"{record.pnl_pct:.6f}",
                    "reason": record.reason,
                    "order_id": record.order_id or "",
                    "metadata_json": json.dumps(record.metadata, separators=(",", ":")),
                }
            )
