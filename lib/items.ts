import type { CategoryId, Household, Item, ListName } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { nameFor } from "@/lib/members";

/*
  Turning the raw items into what the screen shows:
  - the shopping list grouped by shop aisle, oldest first inside each aisle
  - the chores list, with chores for you first
  - the "Done" section, most recently ticked first
  - the live messages ("Lerato ticked Milk") when someone else changes the list
*/

export const MAX_ITEMS = 300;

export function openItems(items: Item[], list: ListName) {
  return items.filter((i) => i.list === list && !i.done);
}

export function doneItems(items: Item[], list: ListName) {
  return items.filter((i) => i.list === list && i.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
}

export type Aisle = { id: CategoryId; label: string; colour: string; items: Item[] };

export function shoppingAisles(items: Item[]): Aisle[] {
  const open = openItems(items, "shopping");
  return CATEGORIES.map((c) => ({ ...c, items: open.filter((i) => i.category === c.id).sort((a, b) => a.createdAt - b.createdAt) })).filter(
    (a) => a.items.length > 0,
  );
}

/** Chores for you first, then ones for anyone, then other people's; oldest first inside each */
export function sortedChores(items: Item[], me: string) {
  const rank = (i: Item) => (i.assignee === me ? 0 : i.assignee === "" ? 1 : 2);
  return openItems(items, "chores").sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt);
}

export function counts(items: Item[]) {
  return {
    shopping: openItems(items, "shopping").length,
    chores: openItems(items, "chores").length,
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
  if (before && after && !before.done && after.done) {
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
