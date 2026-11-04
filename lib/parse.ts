/*
  Reading what you type into the "Add" box:
    "2 milk"        → Milk, amount 2
    "500g mince"    → Mince, amount 500g
    "bread x2"      → Bread, amount 2
    "eggs (dozen)"  → Eggs, amount dozen
    "Bread"         → Bread, no amount
    "2 milk R32,99" → Milk, amount 2, price R32,99 (a price starts with R: "R32", "R 32.99")
  A number at the end only counts as an amount with "x" or a unit ("Vitamin C 1000" stays as it is).
*/

import { parseRand } from "@/lib/money";

export const MAX_TEXT = 80;
export const MAX_QTY = 20;

const UNIT = String.raw`(?:kg|g|l|ml|x|pack|packs|pk|dozen|loaf|loaves|bunch|bunches|tin|tins|can|cans|bottle|bottles|box|boxes|bag|bags|tray|trays|punnet|punnets|roll|rolls)`;
const NUM = String.raw`\d+(?:[.,]\d+)?`;

const front = new RegExp(String.raw`^(${NUM}\s*${UNIT}?)\s+(?:x\s+)?(.+)$`, "i");
const back = new RegExp(String.raw`^(.+?)\s+(?:x\s*(${NUM})|(${NUM}\s*${UNIT}))$`, "i");
const bracket = /^(.+?)\s*\(([^)]{1,20})\)$/;

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export type Parsed = { text: string; qty: string; price?: number };

// A price at the start or end: "R32", "R 32,99", "R1 250.50"
const PRICE = String.raw`R\s?\d{1,3}(?:[ \u00a0]?\d{3})*(?:[.,]\d{1,2})?|R\s?\d+(?:[.,]\d{1,2})?`;
const priceAtEnd = new RegExp(String.raw`^(.*?)\s+(${PRICE})$`, "i");
const priceAtStart = new RegExp(String.raw`^(${PRICE})\s+(.+)$`, "i");

export function parseItem(input: string): Parsed | null {
  let raw = tidy(input);
  if (!raw) return null;

  // Take a price off the end (or the start) first: "2 milk R32,99"
  let price: number | undefined;
  const pe = raw.match(priceAtEnd);
  const ps = pe ? null : raw.match(priceAtStart);
  const found = pe ? { rest: pe[1], price: pe[2] } : ps ? { rest: ps[2], price: ps[1] } : null;
  if (found) {
    const cents = parseRand(found.price);
    if (cents !== null && found.rest.trim()) {
      price = cents;
      raw = tidy(found.rest);
    }
  }

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
  if (!text) return null;
  return price ? { text, qty, price } : { text, qty };
}

/** How an amount is shown next to an item: "2" → "×2", "500g" stays "500g" */
export function qtyLabel(qty: string) {
  return /^\d+(?:[.,]\d+)?$/.test(qty) ? `×${qty}` : qty;
}
