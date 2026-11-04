/*
  The shapes of TickList's data, as stored in Firestore (see firestore.rules and the README).

  users/{uid}                      your name, the households you're in, and the one you're looking at
  households/{id}                  the household: its name, its members and its current invite code
  households/{id}/items/{itemId}   one thing on the shopping list or the chores list
                                   (with a price, or a repeat for chores)
  invites/{code}                   an invite link: which household it's for (only works if you know the code)

  Times are stored as milliseconds (Date.now()), which keeps sorting and "2 min ago" simple.
*/

export type ListName = "shopping" | "chores";

export type CategoryId = "fresh" | "bakery" | "dairy" | "meat" | "pantry" | "frozen" | "drinks" | "snacks" | "household" | "care" | "baby" | "pets" | "other";

export type Member = {
  name: string;
  joinedAt: number;
};

export type Household = {
  id: string;
  name: string;
  createdBy: string; // the owner: whoever started it, or was handed it (lib/household.ts)
  memberIds: string[];
  members: Record<string, Member>;
  inviteCode: string;
  createdAt: number;
  spent?: Record<string, number>; // cents ticked off the shopping list per month: { "2026-11": 245050 }
  atShop?: Record<string, number>; // who pressed "I'm at the shop", and when (lib/household.ts)
  lastInvite?: string; // the invite code used by the last person to join (the rules check it)
};

export type Item = {
  id: string;
  list: ListName;
  text: string;
  qty: string; // "2", "500g", "" when there's no amount
  category: CategoryId; // shopping only: the shop aisle it's sorted into
  assignee: string; // chores only: the member doing it ("" = anyone)
  done: boolean;
  doneBy: string | null;
  doneAt: number | null;
  addedBy: string;
  createdAt: number;
  price: number; // shopping only: cents for this line, 0 = no price
  repeatDays: number; // chores only: 0 = once, or 1, 2, 3, 7, 14 or 28 days (lib/repeat.ts)
  rotate: boolean; // chores only: take turns, so it moves to the next person each time
  dueAt: number | null; // a repeating chore that's done: when it's back on the list
};

export type Profile = {
  name: string;
  households: string[];
  current: string | null;
};

export type Invite = {
  householdId: string;
  householdName: string;
  createdBy: string;
};
