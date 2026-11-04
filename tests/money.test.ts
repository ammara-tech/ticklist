import { describe, expect, it } from "vitest";
import { formatRand, lastMonths, monthKey, parseRand } from "@/lib/money";
import { parseItem } from "@/lib/parse";

describe("prices", () => {
  it("shows rand the South African way", () => {
    expect(formatRand(3299)).toBe("R 32,99");
    expect(formatRand(125050)).toBe("R 1 250,50");
  });

  it("reads prices typed any way", () => {
    expect(parseRand("32,99")).toBe(3299);
    expect(parseRand("R32.99")).toBe(3299);
    expect(parseRand("R 1 250,50")).toBe(125050);
    expect(parseRand("R32")).toBe(3200);
    expect(parseRand("abc")).toBeNull();
    expect(parseRand("0")).toBeNull();
  });

  it("finds a price in what's typed into the Add box", () => {
    expect(parseItem("2 milk R32,99")).toEqual({ text: "Milk", qty: "2", price: 3299 });
    expect(parseItem("R45 bread")).toEqual({ text: "Bread", qty: "", price: 4500 });
    expect(parseItem("500g mince R 89.90")).toEqual({ text: "Mince", qty: "500g", price: 8990 });
    expect(parseItem("Rice")).toEqual({ text: "Rice", qty: "" }); // R without a number isn't a price
    expect(parseItem("R32")).toEqual({ text: "R32", qty: "" }); // only a price: keep it as the name
  });
});

describe("spent per month", () => {
  it("uses South African time for the month", () => {
    expect(monthKey(Date.UTC(2026, 10, 30, 21, 30))).toBe("2026-11"); // 23:30 on 30 Nov in Johannesburg
    expect(monthKey(Date.UTC(2026, 10, 30, 22, 30))).toBe("2026-12"); // 00:30 on 1 Dec
  });

  it("shows the last 6 months, oldest first, with 0 for months with nothing", () => {
    const months = lastMonths({ "2026-11": 24500, "2026-09": 100000, "2025-01": 5 }, Date.UTC(2026, 10, 4, 10));
    expect(months.map((m) => m.key)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(months.map((m) => m.amount)).toEqual([0, 0, 0, 100000, 0, 24500]);
    expect(months[5].label).toBe("Nov");
  });

  it("goes back across a new year", () => {
    expect(lastMonths({}, Date.UTC(2027, 0, 10, 10), 3).map((m) => m.key)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});
