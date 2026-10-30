/*
  The shapes of TickList's data, as stored in Firestore (see firestore.rules and the README).

  users/{uid}                      your name, the households you're in, and the one you're looking at
  households/{id}                  the household: its name, its members and its current invite code
  households/{id}/items/{itemId}   one thing on the shopping list or the chores list
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
  createdBy: string;
  memberIds: string[];
  members: Record<string, Member>;
  inviteCode: string;
  createdAt: number;
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
