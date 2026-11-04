import type { CategoryId, Household, Item, ListName } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { nameFor } from "@/lib/members";
import { isOpen } from "@/lib/repeat";

/*
  Turning the raw items into what the screen shows:
  - the shopping list grouped by shop aisle, oldest first inside each aisle
  - the chores list, with chores for you first
  - the "Done" section, most recently ticked first (a repeating chore waits there until it's due again)
  - the shopping totals: what's still to buy and what's in the trolley
  - the live messages ("Lerato ticked Milk") when someone else changes the list
*/

export const MAX_ITEMS = 300;

export function openItems(items: Item[], list: ListName, now = Date.now()) {
  return items.filter((i) => i.list === list && isOpen(i, now));
}

export function doneItems(items: Item[], list: ListName, now = Date.now()) {
  return items.filter((i) => i.list === list && !isOpen(i, now)).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
}

/** Prices on the shopping list: still to buy, in the trolley, and how many items have a price */
export function shoppingTotals(items: Item[], now = Date.now()) {
  const open = openItems(items, "shopping", now);
  const done = doneItems(items, "shopping", now);
  const sum = (list: Item[]) => list.reduce((s, i) => s + (i.price || 0), 0);
  return { toBuy: sum(open), inTrolley: sum(done), priced: open.filter((i) => i.price > 0).length, open: open.length };
}

export type Aisle = { id: CategoryId; label: string; colour: string; items: Item[] };

export function shoppingAisles(items: Item[], now = Date.now()): Aisle[] {
  const open = openItems(items, "shopping", now);
  return CATEGORIES.map((c) => ({ ...c, items: open.filter((i) => i.category === c.id).sort((a, b) => a.createdAt - b.createdAt) })).filter(
    (a) => a.items.length > 0,
  );
}

/** Chores for you first, then ones for anyone, then other people's; oldest first inside each */
export function sortedChores(items: Item[], me: string, now = Date.now()) {
  const rank = (i: Item) => (i.assignee === me ? 0 : i.assignee === "" ? 1 : 2);
  return openItems(items, "chores", now).sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt);
}

export function counts(items: Item[], now = Date.now()) {
  return {
    shopping: openItems(items, "shopping", now).length,
    chores: openItems(items, "chores", now).length,
  };
}

/** Items saved before prices and repeats existed don't have those fields: fill them in */
export function readItem(id: string, data: Record<string, unknown>): Item {
  const d = data as Partial<Item>;
  return {
    ...(d as Omit<Item, "id">),
    id,
    price: typeof d.price === "number" && d.price > 0 ? Math.round(d.price) : 0,
    repeatDays: typeof d.repeatDays === "number" && d.repeatDays > 0 ? d.repeatDays : 0,
    rotate: d.rotate === true,
    dueAt: typeof d.dueAt === "number" ? d.dueAt : null,
  };
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago" */
export function timeAgo(then: number, now: number) {
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/**
 * The live message for a change someone else made, or null for your own changes
 * (and for changes that don't need a message, like an edit).
 */
export function describeChange(before: Item | undefined, after: Item | undefined, me: string, household: Pick<Household, "members"> | null): string | null {
  if (!before && after) {
    if (after.addedBy === me) return null;
    return `${nameFor(after.addedBy, household, me)} added ${after.text}`;
  }
  // Ticked, or a repeating chore that was due again and has been done again
  if (before && after && after.done && (!before.done || before.doneAt !== after.doneAt)) {
    if (after.doneBy === me) return null;
    return `${nameFor(after.doneBy, household, me)} ticked ${after.text}`;
  }
  return null;
}

/** All the messages for one update of the list: compares the items before and after */
export function changesBetween(before: Map<string, Item>, after: Map<string, Item>, me: string, household: Pick<Household, "members"> | null) {
  const messages: string[] = [];
  for (const [id, item] of after) {
    const text = describeChange(before.get(id), item, me, household);
    if (text) messages.push(text);
  }
  return messages;
}
