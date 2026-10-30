import { describe, expect, it } from "vitest";
import { CATEGORIES, categorize } from "@/lib/categories";

describe("sorting the shopping list into shop aisles", () => {
  it.each([
    ["Full cream milk", "dairy"],
    ["Eggs", "dairy"],
    ["Tomatoes", "fresh"],
    ["Strawberries", "fresh"],
    ["Boerewors", "meat"],
    ["Mielie meal", "pantry"],
    ["Rooibos tea", "pantry"],
    ["Peanut butter", "pantry"],
    ["Tinned tomatoes", "pantry"],
    ["Brown bread", "bakery"],
    ["Simba chips", "snacks"],
    ["Ice cream", "frozen"],
    ["Toilet paper", "household"],
    ["Toothpaste", "care"],
    ["Nappies", "baby"],
    ["Cat food", "pets"],
    ["Coke", "drinks"],
    ["Birthday candles for the cake", "household"],
    ["Something unusual", "other"],
  ])("%s → %s", (text, aisle) => {
    expect(categorize(text)).toBe(aisle);
  });

  it("has every aisle once, with Other last", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.at(-1)).toBe("other");
  });
});
