/*
  Reading what you type into the "Add" box:
    "2 milk"        → Milk, amount 2
    "500g mince"    → Mince, amount 500g
    "bread x2"      → Bread, amount 2
    "eggs (dozen)"  → Eggs, amount dozen
    "Bread"         → Bread, no amount
  A number at the end only counts as an amount with "x" or a unit ("Vitamin C 1000" stays as it is).
*/

export const MAX_TEXT = 80;
export const MAX_QTY = 20;

const UNIT = String.raw`(?:kg|g|l|ml|x|pack|packs|pk|dozen|loaf|loaves|bunch|bunches|tin|tins|can|cans|bottle|bottles|box|boxes|bag|bags|tray|trays|punnet|punnets|roll|rolls)`;
const NUM = String.raw`\d+(?:[.,]\d+)?`;

const front = new RegExp(String.raw`^(${NUM}\s*${UNIT}?)\s+(?:x\s+)?(.+)$`, "i");
const back = new RegExp(String.raw`^(.+?)\s+(?:x\s*(${NUM})|(${NUM}\s*${UNIT}))$`, "i");
const bracket = /^(.+?)\s*\(([^)]{1,20})\)$/;

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export type Parsed = { text: string; qty: string };

export function parseItem(input: string): Parsed | null {
  const raw = tidy(input);
  if (!raw) return null;

  let text = raw;
  let qty = "";
  const b = raw.match(bracket);
  const f = raw.match(front);
  const k = raw.match(back);
  if (b) {
    text = b[1];
    qty = b[2];
  } else if (f && /[a-z]/i.test(f[2])) {
    text = f[2];
    qty = f[1].replace(/\s+/g, "").replace(/x$/i, "");
  } else if (k) {
    text = k[1];
    qty = (k[2] ?? k[3]).replace(/\s+/g, "");
  }
  text = capital(tidy(text)).slice(0, MAX_TEXT);
  qty = tidy(qty).slice(0, MAX_QTY);
  return text ? { text, qty } : null;
}

/** How an amount is shown next to an item: "2" → "×2", "500g" stays "500g" */
export function qtyLabel(qty: string) {
  return /^\d+(?:[.,]\d+)?$/.test(qty) ? `×${qty}` : qty;
}
