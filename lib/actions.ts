"use client";

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { categorize } from "@/lib/categories";
import { makeInviteCode, isInviteCode } from "@/lib/invite";
import { MAX_NAME } from "@/lib/members";
import { parseItem, parseMany } from "@/lib/parse";
import { isOwner, nextOwner } from "@/lib/household";
import { MAX_ITEMS } from "@/lib/items";
import { monthKey } from "@/lib/money";
import { isOpen, tickChanges } from "@/lib/repeat";
import { getApp, reportProblem } from "@/lib/store";
import type { Household, Invite, Item, ListName } from "@/lib/types";

/*
  Every change TickList makes to Firestore. firestore.rules checks each one on
  Google's servers: only members can touch a household, and you can only add or
  remove yourself.

  Ticking, adding and editing items are not awaited: Firestore shows them straight
  away and sends them when it can, so they work offline. Creating and joining a
  household need a connection, so those are awaited and can fail with a message.
*/

const db = () => firebase().db;
const me = () => {
  const uid = getApp().uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};
const householdId = () => getApp().household?.id ?? null;

/** For writes we don't wait for: tell the person if the server refuses one */
function quietly(promise: Promise<unknown>) {
  promise.catch(() => reportProblem("A change couldn't be saved. You may have been removed from this household, or the connection dropped. Refresh to see the latest list."));
}

const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

// ---------- Households ----------

export async function createHousehold(name: string) {
  const uid = me();
  const myName = cleanName(getApp().profile.name) || "Me";
  const ref = doc(collection(db(), "households"));
  const code = makeInviteCode();
  const now = Date.now();
  const household: Omit<Household, "id"> = {
    name: cleanName(name) || "Our home",
    createdBy: uid,
    memberIds: [uid],
    members: { [uid]: { name: myName, joinedAt: now } },
    inviteCode: code,
    createdAt: now,
  };
  const batch = writeBatch(db());
  batch.set(ref, household);
  batch.set(doc(db(), "invites", code), { householdId: ref.id, householdName: household.name, createdBy: uid } satisfies Invite);
  batch.set(doc(db(), "users", uid), { name: myName, households: arrayUnion(ref.id), current: ref.id }, { merge: true });
  await batch.commit();
  return ref.id;
}

/** Looks up an invite code: which household it's for, or null if it doesn't work */
export async function readInvite(code: string): Promise<Invite | null> {
  if (!isInviteCode(code)) return null;
  try {
    const snap = await getDoc(doc(db(), "invites", code));
    return snap.exists() ? (snap.data() as Invite) : null;
  } catch {
    return null;
  }
}

export async function joinHousehold(code: string) {
  const uid = me();
  const invite = await readInvite(code);
  if (!invite) throw new Error("This invite link doesn't work any more. Ask for a new one.");
  const { profile } = getApp();
  if (!profile.households.includes(invite.householdId)) {
    // Adds only yourself. The rules check that "lastInvite" is a real invite for this household.
    await updateDoc(doc(db(), "households", invite.householdId), {
      memberIds: arrayUnion(uid),
      [`members.${uid}`]: { name: cleanName(profile.name) || "Me", joinedAt: Date.now() },
      lastInvite: code,
    });
  }
  await setDoc(doc(db(), "users", uid), { name: cleanName(profile.name) || "Me", households: arrayUnion(invite.householdId), current: invite.householdId }, { merge: true });
  return invite;
}

/** The name of another household you're in (for the list on the Household page) */
export async function readHouseholdName(id: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db(), "households", id));
    return snap.exists() ? String(snap.data()?.name ?? "") || null : null;
  } catch {
    return null;
  }
}

export function switchHousehold(id: string) {
  quietly(setDoc(doc(db(), "users", me()), { current: id }, { merge: true }));
}

export function renameHousehold(name: string) {
  const id = householdId();
  const household = getApp().household;
  const clean = cleanName(name);
  if (!id || !household || !clean) return;
  const batch = writeBatch(db());
  batch.update(doc(db(), "households", id), { name: clean });
  batch.update(doc(db(), "invites", household.inviteCode), { householdName: clean });
  quietly(batch.commit());
}

/** A new invite link. The old one stops working straight away. */
export async function newInviteLink() {
  const household = getApp().household;
  if (!household) return;
  const code = makeInviteCode();
  const batch = writeBatch(db());
  batch.set(doc(db(), "invites", code), { householdId: household.id, householdName: household.name, createdBy: me() } satisfies Invite);
  batch.update(doc(db(), "households", household.id), { inviteCode: code });
  batch.delete(doc(db(), "invites", household.inviteCode));
  await batch.commit();
}

/**
 * Leave the household. If you're the owner, the person who's been in it longest becomes the owner.
 * The last person to leave deletes it, with its lists and invite link.
 */
export async function leaveHousehold() {
  const uid = me();
  const household = getApp().household;
  if (!household) return;
  const ref = doc(db(), "households", household.id);
  const others = household.memberIds.filter((id) => id !== uid);

  // Out of your profile first, so the app moves on even if the next step is slow
  await setDoc(doc(db(), "users", uid), { households: arrayRemove(household.id), current: null }, { merge: true });

  if (others.length === 0) {
    const items = await getDocs(collection(ref, "items"));
    const batch = writeBatch(db());
    items.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db(), "invites", household.inviteCode));
    batch.delete(ref);
    await batch.commit();
  } else {
    await updateDoc(ref, {
      memberIds: arrayRemove(uid),
      [`members.${uid}`]: deleteField(),
      [`atShop.${uid}`]: deleteField(),
      ...(isOwner(household, uid) ? { createdBy: nextOwner(household, uid) } : {}),
    });
  }
}

// ---------- Owner only (the rules check it's really the owner) ----------

/** Removes someone from the household. Their phone notices and moves them on. */
export async function removeMember(memberId: string) {
  const household = getApp().household;
  if (!household || !isOwner(household, me()) || memberId === me()) return;
  await updateDoc(doc(db(), "households", household.id), {
    memberIds: arrayRemove(memberId),
    [`members.${memberId}`]: deleteField(),
    [`atShop.${memberId}`]: deleteField(),
  });
}

/** Makes someone else the owner */
export async function handOver(memberId: string) {
  const household = getApp().household;
  if (!household || !isOwner(household, me()) || !household.memberIds.includes(memberId)) return;
  await updateDoc(doc(db(), "households", household.id), { createdBy: memberId });
}

/** Deletes the household for everyone: its lists, its invite link and the household itself */
export async function deleteHouseholdForEveryone() {
  const uid = me();
  const household = getApp().household;
  if (!household || !isOwner(household, uid)) return;
  const ref = doc(db(), "households", household.id);
  await setDoc(doc(db(), "users", uid), { households: arrayRemove(household.id), current: null }, { merge: true });
  const items = await getDocs(collection(ref, "items"));
  const batch = writeBatch(db());
  items.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db(), "invites", household.inviteCode));
  batch.delete(ref);
  await batch.commit();
}

// ---------- I'm at the shop ----------

/** Tells everyone you're at the shop (or that you're done). It wears off by itself after 3 hours. */
export function setAtShop(there: boolean) {
  const id = householdId();
  if (!id) return;
  quietly(updateDoc(doc(db(), "households", id), { [`atShop.${me()}`]: there ? Date.now() : deleteField() }));
}

/** Takes a household you can no longer open (you were removed, or it was deleted) off your profile */
export function forgetHousehold(id: string) {
  const { profile, uid } = getApp();
  if (!uid || !profile.households.includes(id)) return;
  const rest = profile.households.filter((h) => h !== id);
  quietly(setDoc(doc(db(), "users", uid), { households: arrayRemove(id), current: rest[0] ?? null }, { merge: true }));
}

/** Your name, in your profile and in every household you're in */
export function setMyName(name: string) {
  const uid = me();
  const clean = cleanName(name);
  if (!clean) return;
  const { profile } = getApp();
  const batch = writeBatch(db());
  batch.set(doc(db(), "users", uid), { name: clean }, { merge: true });
  for (const id of profile.households) batch.update(doc(db(), "households", id), { [`members.${uid}.name`]: clean });
  quietly(batch.commit());
}

// ---------- Items ----------

const itemsOf = (id: string) => collection(db(), "households", id, "items");

/**
 * Adds what was typed to a list: one thing ("2 milk R32"), or several separated by commas or
 * new lines ("milk, bread, eggs"). Returns how many were added (0 if there was nothing to add).
 */
export function addItem(list: ListName, input: string, assignee = "", repeatDays = 0, rotate = false) {
  const id = householdId();
  if (!id) return 0;
  const room = MAX_ITEMS - getApp().items.length;
  const all = parseMany(input).slice(0, Math.max(0, room));
  if (all.length === 0) return 0;
  const batch = writeBatch(db());
  const now = Date.now();
  all.forEach((parsed, n) => batch.set(doc(itemsOf(id)), newItem(list, parsed, assignee, repeatDays, rotate, now + n)));
  quietly(batch.commit());
  return all.length;
}

function newItem(list: ListName, parsed: NonNullable<ReturnType<typeof parseItem>>, assignee: string, repeatDays: number, rotate: boolean, createdAt: number) {
  const item: Omit<Item, "id"> = {
    list,
    text: parsed.text,
    qty: parsed.qty,
    category: list === "shopping" ? categorize(parsed.text) : "other",
    assignee: list === "chores" ? assignee : "",
    done: false,
    doneBy: null,
    doneAt: null,
    addedBy: me(),
    createdAt,
    price: list === "shopping" ? (parsed.price ?? 0) : 0,
    repeatDays: list === "chores" ? repeatDays : 0,
    rotate: list === "chores" && repeatDays > 0 && rotate,
    dueAt: null,
  };
  return item;
}

/**
 * Ticks or unticks. Ticking a repeating chore sends it to Done until it's due again (and to the
 * next person, when taking turns). Ticking a priced shopping item adds it to this month's spending;
 * unticking takes it off again.
 */
export function toggleItem(item: Item) {
  const id = householdId();
  const household = getApp().household;
  if (!id || !household) return;
  const now = Date.now();
  const batch = writeBatch(db());
  if (isOpen(item, now)) {
    batch.update(doc(itemsOf(id), item.id), tickChanges(item, me(), now, household));
    if (item.list === "shopping" && item.price > 0) {
      batch.update(doc(db(), "households", id), { [`spent.${monthKey(now)}`]: increment(item.price) });
    }
  } else {
    batch.update(doc(itemsOf(id), item.id), { done: false, doneBy: null, doneAt: null, dueAt: null });
    if (item.list === "shopping" && item.price > 0 && item.doneAt) {
      batch.update(doc(db(), "households", id), { [`spent.${monthKey(item.doneAt)}`]: increment(-item.price) });
    }
  }
  quietly(batch.commit());
}

/** How often a chore comes back, and whether people take turns */
export function setRepeat(item: Item, repeatDays: number, rotate: boolean) {
  const id = householdId();
  if (!id) return;
  quietly(updateDoc(doc(itemsOf(id), item.id), { repeatDays, rotate: repeatDays > 0 && rotate, ...(repeatDays === 0 ? { dueAt: null } : {}) }));
}

export function editItem(item: Item, input: string) {
  const id = householdId();
  const parsed = parseItem(input);
  if (!id || !parsed) return;
  quietly(
    updateDoc(doc(itemsOf(id), item.id), {
      text: parsed.text,
      qty: parsed.qty,
      ...(item.list === "shopping" ? { category: categorize(parsed.text), price: parsed.price ?? 0 } : {}),
    }),
  );
}

export function assignChore(item: Item, assignee: string) {
  const id = householdId();
  if (!id) return;
  quietly(updateDoc(doc(itemsOf(id), item.id), { assignee }));
}

export function removeItem(item: Item) {
  const id = householdId();
  if (!id) return;
  const batch = writeBatch(db());
  batch.delete(doc(itemsOf(id), item.id));
  quietly(batch.commit());
}

/** Puts back items that were removed (Undo) */
export function restoreItems(items: Item[]) {
  const id = householdId();
  if (!id || items.length === 0) return;
  const batch = writeBatch(db());
  for (const { id: itemId, ...data } of items) batch.set(doc(itemsOf(id), itemId), data);
  quietly(batch.commit());
}

/**
 * Clears the "Done" section of a list. Returns what was cleared, for Undo.
 * Repeating chores stay: they're waiting to come back. What was spent stays counted.
 */
export function clearDone(list: ListName): Item[] {
  const id = householdId();
  if (!id) return [];
  const done = getApp().items.filter((i) => i.list === list && i.done && !(i.repeatDays > 0));
  if (done.length === 0) return [];
  const batch = writeBatch(db());
  for (const item of done) batch.delete(doc(itemsOf(id), item.id));
  quietly(batch.commit());
  return done;
}

// ---------- Try the demo ----------

/** For a new demo (lib/demo.ts): a household with a shopping list (some with prices) and chores that repeat */
export async function seedDemo() {
  const id = await createHousehold("The demo house");
  const uid = me();
  const batch = writeBatch(db());
  let n = Date.now();
  const add = (list: ListName, input: string, repeatDays = 0) => {
    for (const parsed of parseMany(input)) batch.set(doc(itemsOf(id)), newItem(list, parsed, list === "chores" ? uid : "", repeatDays, false, n++));
  };
  add("shopping", "2 milk R32, bread R18, 6 eggs, 1kg rice R45, apples, coffee R89, toothpaste");
  add("chores", "Take out the bins", 7);
  add("chores", "Water the plants", 3);
  add("chores", "Wash the car");
  quietly(batch.commit());
}

/**
 * Leaves every household (the last person out deletes it, with its lists and invite link) and
 * empties the profile. Used when a demo ends. Needs a connection, so it waits.
 */
export async function deleteEverything() {
  const uid = me();
  for (const id of getApp().profile.households) {
    const ref = doc(db(), "households", id);
    const snap = await getDoc(ref).catch(() => null);
    if (!snap?.exists()) continue;
    const household = { id, ...(snap.data() as Omit<Household, "id">) };
    const others = household.memberIds.filter((m) => m !== uid);
    if (others.length === 0) {
      const items = await getDocs(collection(ref, "items"));
      const batch = writeBatch(db());
      items.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db(), "invites", household.inviteCode));
      batch.delete(ref);
      await batch.commit();
    } else {
      await updateDoc(ref, {
        memberIds: arrayRemove(uid),
        [`members.${uid}`]: deleteField(),
        [`atShop.${uid}`]: deleteField(),
        ...(isOwner(household, uid) ? { createdBy: nextOwner(household, uid) } : {}),
      });
    }
  }
  // The profile is emptied rather than deleted (the rules only allow writing it, with these fields)
  await setDoc(doc(db(), "users", uid), { name: "Guest", households: [], current: null });
}
