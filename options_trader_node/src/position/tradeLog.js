import { appendFile, stat, writeFile } from "node:fs/promises";

const HEADER = "timestamp,action,symbol,option_type,expiration_date,strike,quantity,order_price,mark_price,underlying_price,pnl_pct,reason,order_id,metadata_json\n";

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export class TradeLogger {
  constructor(path) {
    this.path = path;
  }

  async append(record) {
    let hasFile = true;
    try {
      await stat(this.path);
    } catch {
      hasFile = false;
    }
    if (!hasFile) await writeFile(this.path, HEADER, "utf-8");

    const row = [
      record.timestamp,
      record.action,
      record.symbol,
      record.optionType,
      record.expirationDate,
      Number(record.strike).toFixed(2),
      record.quantity,
      Number(record.orderPrice).toFixed(4),
      Number(record.markPrice).toFixed(4),
      Number(record.underlyingPrice).toFixed(4),
      Number(record.pnlPct).toFixed(6),
      record.reason,
      record.orderId ?? "",
      JSON.stringify(record.metadata ?? {}),
    ]
      .map(csvEscape)
      .join(",");

    await appendFile(this.path, `${row}\n`, "utf-8");
  }
}
