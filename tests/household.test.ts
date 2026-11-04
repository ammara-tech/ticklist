import { describe, expect, it } from "vitest";
import { AT_SHOP_HOURS, atShop, householdChanges, isOwner, nextOwner, withRoles } from "@/lib/household";

const HOUR = 3_600_000;
const home = {
  createdBy: "me",
  memberIds: ["me", "lerato", "sipho"],
  members: {
    me: { name: "Ammara", joinedAt: 1 },
    lerato: { name: "Lerato", joinedAt: 3 },
    sipho: { name: "Sipho", joinedAt: 2 },
  },
  atShop: {} as Record<string, number>,
};

describe("the owner", () => {
  it("is whoever started the household", () => {
    expect(isOwner(home, "me")).toBe(true);
    expect(isOwner(home, "lerato")).toBe(false);
  });

  it("goes to whoever has been in the household longest when the owner leaves", () => {
    expect(nextOwner(home, "me")).toBe("sipho");
    expect(nextOwner(home, "sipho")).toBe("me");
  });

  it("goes to nobody when the last person leaves", () => {
    expect(nextOwner({ memberIds: ["me"], members: home.members }, "me")).toBeNull();
  });

  it("is marked in the members list", () => {
    expect(withRoles(home).map((m) => [m.name, m.owner])).toEqual([
      ["Ammara", true],
      ["Lerato", false],
      ["Sipho", false],
    ]);
  });
});

describe("I'm at the shop", () => {
  const now = 10 * HOUR;

  it("lists who's at the shop", () => {
    const h = { ...home, atShop: { lerato: now - HOUR } };
    expect(atShop(h, now)).toEqual([{ uid: "lerato", since: now - HOUR, name: "Lerato" }]);
  });

  it(`wears off after ${AT_SHOP_HOURS} hours`, () => {
    const h = { ...home, atShop: { lerato: now - AT_SHOP_HOURS * HOUR } };
    expect(atShop(h, now)).toEqual([]);
  });

  it("ignores anyone who has left the household", () => {
    const h = { ...home, atShop: { gone: now } };
    expect(atShop(h, now)).toEqual([]);
  });
});

describe("live messages about the household", () => {
  const now = 10 * HOUR;

  it("says who joined", () => {
    const after = { ...home, memberIds: [...home.memberIds, "thabo"], members: { ...home.members, thabo: { name: "Thabo", joinedAt: 4 } } };
    expect(householdChanges(home, after, "me", now)).toEqual(["Thabo joined the household"]);
  });

  it("says who went to the shop, but not when it's you", () => {
    const after = { ...home, atShop: { lerato: now, me: now } };
    expect(householdChanges(home, after, "me", now)).toEqual(["Lerato is at the shop. Add what you need!"]);
  });

  it("says nothing for the first look at the household, or when nothing changed", () => {
    expect(householdChanges(null, home, "me", now)).toEqual([]);
    expect(householdChanges(home, { ...home }, "me", now)).toEqual([]);
  });

  it("doesn't say you joined", () => {
    const before = { ...home, memberIds: ["lerato", "sipho"] };
    expect(householdChanges(before, home, "me", now)).toEqual([]);
  });
});
