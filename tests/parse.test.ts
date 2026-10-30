import { describe, expect, it } from "vitest";
import { parseItem, qtyLabel } from "@/lib/parse";

describe("reading what's typed into the Add box", () => {
  it.each([
    ["2 milk", "Milk", "2"],
    ["500g mince", "Mince", "500g"],
    ["500 g mince", "Mince", "500g"],
    ["2x bread", "Bread", "2"],
    ["2 x bread", "Bread", "2"],
    ["bread x2", "Bread", "2"],
    ["bread x 2", "Bread", "2"],
    ["mince 1kg", "Mince", "1kg"],
    ["eggs (dozen)", "Eggs", "dozen"],
    ["1.5l coke", "Coke", "1.5l"],
    ["Bread", "Bread", ""],
    ["  take   the bins out ", "Take the bins out", ""],
  ])("%s → %s, amount %s", (input, text, qty) => {
    expect(parseItem(input)).toEqual({ text, qty });
  });

  it("keeps a number that isn't an amount as part of the name", () => {
    expect(parseItem("Vitamin C 1000")).toEqual({ text: "Vitamin C 1000", qty: "" });
    expect(parseItem("7up")).toEqual({ text: "7up", qty: "" });
  });

  it("ignores an empty box, and keeps names and amounts short", () => {
    expect(parseItem("   ")).toBe(null);
    expect(parseItem("a".repeat(120))!.text).toHaveLength(80);
  });

  it("shows a plain number as ×2, and a unit as it is", () => {
    expect(qtyLabel("2")).toBe("×2");
    expect(qtyLabel("500g")).toBe("500g");
  });
});
