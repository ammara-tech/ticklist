import { describe, expect, it } from "vitest";
import { changesBetween, counts, describeChange, doneItems, shoppingAisles, sortedChores, timeAgo } from "@/lib/items";
import type { Item } from "@/lib/types";

const item = (over: Partial<Item>): Item => ({
  id: "x",
  list: "shopping",
  text: "Milk",
  qty: "",
  category: "dairy",
  assignee: "",
  done: false,
  doneBy: null,
  doneAt: null,
  addedBy: "me",
  createdAt: 1,
  ...over,
});
const household = { members: { me: { name: "Ammara", joinedAt: 1 }, lerato: { name: "Lerato", joinedAt: 2 } } };

describe("the lists", () => {
  const items = [
    item({ id: "1", text: "Milk", category: "dairy", createdAt: 3 }),
    item({ id: "2", text: "Apples", category: "fresh", createdAt: 5 }),
    item({ id: "3", text: "Cheese", category: "dairy", createdAt: 1 }),
    item({ id: "4", text: "Bread", category: "bakery", done: true, doneAt: 10 }),
    item({ id: "5", text: "Eggs", category: "dairy", done: true, doneAt: 20 }),
    item({ id: "6", list: "chores", text: "Bins", assignee: "lerato", createdAt: 1 }),
    item({ id: "7", list: "chores", text: "Dishes", assignee: "me", createdAt: 9 }),
    item({ id: "8", list: "chores", text: "Sweep", assignee: "", createdAt: 2 }),
  ];

  it("groups shopping by aisle in shop order, oldest first in each aisle, and leaves out ticked things", () => {
    const aisles = shoppingAisles(items);
    expect(aisles.map((a) => a.id)).toEqual(["fresh", "dairy"]);
    expect(aisles[1].items.map((i) => i.text)).toEqual(["Cheese", "Milk"]);
  });

  it("puts your chores first, then anyone's, then other people's", () => {
    expect(sortedChores(items, "me").map((i) => i.text)).toEqual(["Dishes", "Sweep", "Bins"]);
  });

  it("shows the most recently ticked first in Done", () => {
    expect(doneItems(items, "shopping").map((i) => i.text)).toEqual(["Eggs", "Bread"]);
  });

  it("counts what's still to do on each list", () => {
    expect(counts(items)).toEqual({ shopping: 3, chores: 3 });
  });
});

describe("live messages", () => {
  it("tells you when someone else adds or ticks something", () => {
    expect(describeChange(undefined, item({ addedBy: "lerato" }), "me", household)).toBe("Lerato added Milk");
    expect(describeChange(item({}), item({ done: true, doneBy: "lerato" }), "me", household)).toBe("Lerato ticked Milk");
  });

  it("stays quiet about your own changes and about edits", () => {
    expect(describeChange(undefined, item({ addedBy: "me" }), "me", household)).toBe(null);
    expect(describeChange(item({}), item({ done: true, doneBy: "me" }), "me", household)).toBe(null);
    expect(describeChange(item({}), item({ text: "Low fat milk" }), "me", household)).toBe(null);
  });

  it("says Someone for a person who has left", () => {
    expect(describeChange(undefined, item({ addedBy: "gone" }), "me", household)).toBe("Someone added Milk");
  });

  it("finds every change between two versions of the list", () => {
    const before = new Map([["1", item({ id: "1" })]]);
    const after = new Map([
      ["1", item({ id: "1", done: true, doneBy: "lerato" })],
      ["2", item({ id: "2", text: "Bread", addedBy: "lerato" })],
    ]);
    expect(changesBetween(before, after, "me", household)).toEqual(["Lerato ticked Milk", "Lerato added Bread"]);
  });
});

describe("time ago", () => {
  const now = 1_000_000_000;
  it.each([
    [10_000, "just now"],
    [5 * 60_000, "5 min ago"],
    [3 * 3_600_000, "3 h ago"],
    [26 * 3_600_000, "yesterday"],
    [4 * 86_400_000, "4 days ago"],
  ])("%i ms ago → %s", (ms: number, text: string) => {
    expect(timeAgo(now - ms, now)).toBe(text);
  });
});
