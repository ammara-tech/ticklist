import type { Household, Member } from "@/lib/types";

/*
  People in a household: who owns it, who's at the shop, and who just joined.
  - The owner is whoever started the household (createdBy). The owner can remove people,
    hand over ownership, or delete the household for everyone.
  - If the owner leaves, the person who's been in it longest becomes the owner, so a
    household is never left without one. The last person to leave deletes it.
  - "I'm at the shop" lasts 3 hours, in case someone forgets to press "I'm done".
  The rules in firestore.rules check all of this on Google's servers too.
  Tested in tests/household.test.ts.
*/

export const AT_SHOP_HOURS = 3;

export const isOwner = (household: Pick<Household, "createdBy">, uid: string) => household.createdBy === uid;

/** Who becomes the owner when `leaving` goes: the person who's been in the household longest */
export function nextOwner(household: Pick<Household, "memberIds" | "members">, leaving: string): string | null {
  const others = household.memberIds.filter((id) => id !== leaving);
  if (others.length === 0) return null;
  return [...others].sort((a, b) => (household.members[a]?.joinedAt ?? 0) - (household.members[b]?.joinedAt ?? 0))[0];
}

/** Everyone at the shop right now (not counting anyone who pressed it more than 3 hours ago) */
export function atShop(household: Pick<Household, "atShop" | "members" | "memberIds">, now: number) {
  return Object.entries(household.atShop ?? {})
    .filter(([uid, since]) => household.memberIds.includes(uid) && typeof since === "number" && now - since < AT_SHOP_HOURS * 3_600_000)
    .map(([uid, since]) => ({ uid, since, name: household.members[uid]?.name || "Someone" }));
}

/** The live messages when the household changes: who joined, and who's gone to the shop */
export function householdChanges(
  before: Pick<Household, "memberIds" | "members" | "atShop"> | null,
  after: Pick<Household, "memberIds" | "members" | "atShop">,
  me: string,
  now: number,
): string[] {
  if (!before) return [];
  const messages: string[] = [];
  for (const id of after.memberIds) {
    if (id !== me && !before.memberIds.includes(id)) messages.push(`${after.members[id]?.name || "Someone"} joined the household`);
  }
  const wasThere = new Set(atShop({ ...before, memberIds: after.memberIds, members: after.members }, now).map((p) => p.uid));
  for (const p of atShop(after, now)) {
    if (p.uid !== me && !wasThere.has(p.uid)) messages.push(`${p.name} is at the shop. Add what you need!`);
  }
  return messages;
}

/** The members, with the owner marked, in the order they joined */
export function withRoles(household: Pick<Household, "createdBy" | "memberIds" | "members">) {
  return household.memberIds.map((id) => ({ id, ...(household.members[id] ?? ({ name: "Someone", joinedAt: 0 } as Member)), owner: id === household.createdBy }));
}
