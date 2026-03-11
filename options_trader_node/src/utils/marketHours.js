export function isUsMarketOpenNow(now = new Date()) {
  // Convert to America/New_York local parts.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekday = map.weekday;
  const hour = Number(map.hour);
  const minute = Number(map.minute);

  if (weekday === "Sat" || weekday === "Sun") return false;

  const current = hour * 60 + minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return current >= open && current <= close;
}
