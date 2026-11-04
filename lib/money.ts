/*
  Prices on the shopping list, in rand. Money is kept in cents (whole numbers), so adding
  up never gives answers like R 0,30000000004. Tested in tests/money.test.ts.
*/

export const MAX_PRICE = 1_000_000_00; // R1 million: anything more is a typing mistake

/** 3299 → "R 32,99", 125050 → "R 1 250,50" (South African style, the same on every phone) */
export function formatRand(cents: number) {
  const abs = Math.abs(Math.round(cents));
  const rands = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${cents < 0 ? "-" : ""}R ${rands},${String(abs % 100).padStart(2, "0")}`;
}

/** "32,99", "32.99", "R32", "R 1 250,50" → cents, or null if it isn't a price */
export function parseRand(text: string): number | null {
  const t = text.trim().replace(/^R\s*/i, "").replace(/[\s ]/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(t)) return null;
  const cents = Math.round(Number(t.replace(",", ".")) * 100);
  return cents > 0 && cents <= MAX_PRICE ? cents : null;
}

/** "2026-11" for a time (in South African time), the key used for "spent per month" */
export function monthKey(ms: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Africa/Johannesburg" }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

/** The last `count` months, oldest first, with what was spent in each (0 if nothing) */
export function lastMonths(spent: Record<string, number> | undefined, now: number, count = 6) {
  const [y, m] = monthKey(now).split("-").map(Number);
  const out: { key: string; label: string; amount: number }[] = [];
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: names[d.getUTCMonth()], amount: Math.max(0, spent?.[key] ?? 0) });
  }
  return out;
}
