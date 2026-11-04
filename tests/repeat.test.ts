import { describe, expect, it } from "vitest";
import { backWhen, dueAfter, isOpen, isWaiting, nextInTurn, readRepeatValue, repeatValue, tickChanges } from "@/lib/repeat";
import { counts, doneItems, describeChange, openItems, readItem, shoppingTotals } from "@/lib/items";
import type { Item } from "@/lib/types";

const day = 86_400_000;
const monday = new Date(2026, 10, 2, 18, 30).getTime(); // Mon 2 Nov 2026, 18:30 on this computer's clock

function chore(extra: Partial<Item> = {}): Item {
  return {
    id: "c1", list: "chores", text: "Bins out", qty: "", category: "other", assignee: "", done: false, doneBy: null, doneAt: null,
    addedBy: "a", createdAt: 0, price: 0, repeatDays: 7, rotate: false, dueAt: null, ...extra,
  };
}
const household = { memberIds: ["a", "b", "c"] };

describe("repeating chores", () => {
  it("come back at the start of the day they're due, not 24-hour steps later", () => {
    const due = dueAfter(monday, 7);
    expect(new Date(due).getDate()).toBe(9);
    expect(new Date(due).getHours()).toBe(0);
  });

  it("wait in Done after they're ticked, then are back on the list when due", () => {
    const ticked = { ...chore(), ...tickChanges(chore(), "a", monday, household) };
    expect(ticked.done).toBe(true);
    expect(isWaiting(ticked, monday + day)).toBe(true);
    expect(isOpen(ticked, monday + day)).toBe(false);
    expect(isOpen(ticked, dueAfter(monday, 7))).toBe(true); // Monday 9 Nov, first thing
  });

  it("a chore that happens once is simply done", () => {
    const once = chore({ repeatDays: 0 });
    const ticked = { ...once, ...tickChanges(once, "a", monday, household) };
    expect(ticked.dueAt).toBeNull();
    expect(isOpen(ticked, monday + 365 * day)).toBe(false);
  });

  it("move to the next person when taking turns, and back to the first after the last", () => {
    expect(nextInTurn(household, "a", "a")).toBe("b");
    expect(nextInTurn(household, "c", "c")).toBe("a");
    expect(nextInTurn(household, "", "b")).toBe("c"); // for anyone: the person after whoever did it
    const turns = chore({ rotate: true, assignee: "b" });
    expect(tickChanges(turns, "b", monday, household).assignee).toBe("c");
    expect("assignee" in tickChanges(chore({ assignee: "b" }), "b", monday, household)).toBe(false); // not taking turns
  });

  it("say when they're back", () => {
    expect(backWhen(dueAfter(monday, 1), monday)).toBe("Back tomorrow");
    expect(backWhen(dueAfter(monday, 7), monday)).toBe("Back Mon 9 Nov");
  });

  it("turn the Repeat picker's choices into settings and back", () => {
    expect(readRepeatValue("7t")).toEqual({ repeatDays: 7, rotate: true });
    expect(readRepeatValue("7")).toEqual({ repeatDays: 7, rotate: false });
    expect(readRepeatValue("0t")).toEqual({ repeatDays: 0, rotate: false });
    expect(readRepeatValue("5")).toEqual({ repeatDays: 0, rotate: false }); // not a choice
    expect(repeatValue(14, true)).toBe("14t");
    expect(repeatValue(0, true)).toBe("0");
  });
});

describe("the lists with repeats and prices", () => {
  it("count a repeating chore as waiting until it's due, then as to do", () => {
    const waiting = chore({ done: true, doneAt: monday, dueAt: dueAfter(monday, 7) });
    expect(counts([waiting], monday + day).chores).toBe(0);
    expect(doneItems([waiting], "chores", monday + day)).toHaveLength(1);
    expect(openItems([waiting], "chores", dueAfter(monday, 7))).toHaveLength(1);
  });

  it("add up the shopping: still to buy and in the trolley", () => {
    const shop = (id: string, price: number, done = false): Item => ({ ...chore({ id, list: "shopping", repeatDays: 0, price, done }) });
    const t = shoppingTotals([shop("1", 3299), shop("2", 0), shop("3", 4500, true)], monday);
    expect(t).toEqual({ toBuy: 3299, inTrolley: 4500, priced: 1, open: 2 });
  });

  it("fill in prices and repeats for items saved before they existed", () => {
    const old = readItem("x", { list: "shopping", text: "Milk", qty: "2", category: "dairy", assignee: "", done: false, doneBy: null, doneAt: null, addedBy: "a", createdAt: 1 });
    expect([old.price, old.repeatDays, old.rotate, old.dueAt]).toEqual([0, 0, false, null]);
  });

  it("says when someone does a repeating chore again", () => {
    const before = chore({ done: true, doneBy: "b", doneAt: monday - 7 * day, dueAt: monday - day });
    const after = { ...before, doneBy: "b", doneAt: monday };
    expect(describeChange(before, after, "a", { members: { b: { name: "Lerato", joinedAt: 0 } } })).toBe("Lerato ticked Bins out");
  });
});
