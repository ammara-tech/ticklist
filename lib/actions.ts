"use client";

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { categorize } from "@/lib/categories";
import { makeInviteCode, isInviteCode } from "@/lib/invite";
import { MAX_NAME } from "@/lib/members";
import { parseItem } from "@/lib/parse";
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

/** Leave the household. The last person to leave deletes it, with its lists and invite link. */
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
    await updateDoc(ref, { memberIds: arrayRemove(uid), [`members.${uid}`]: deleteField() });
  }
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

/** Adds what was typed ("2 milk") to a list. Returns false if there was nothing to add. */
export function addItem(list: ListName, input: string, assignee = "") {
  const id = householdId();
  const parsed = parseItem(input);
  if (!id || !parsed) return false;
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
    createdAt: Date.now(),
  };
  quietly(setDoc(doc(itemsOf(id)), item));
  return true;
}

export function toggleItem(item: Item) {
  const id = householdId();
  if (!id) return;
  const done = !item.done;
  quietly(updateDoc(doc(itemsOf(id), item.id), { done, doneBy: done ? me() : null, doneAt: done ? Date.now() : null }));
}

export function editItem(item: Item, input: string) {
  const id = householdId();
  const parsed = parseItem(input);
  if (!id || !parsed) return;
  quietly(
    updateDoc(doc(itemsOf(id), item.id), {
      text: parsed.text,
      qty: parsed.qty,
      ...(item.list === "shopping" ? { category: categorize(parsed.text) } : {}),
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

/** Clears the "Done" section of a list. Returns what was cleared, for Undo. */
export function clearDone(list: ListName): Item[] {
  const id = householdId();
  if (!id) return [];
  const done = getApp().items.filter((i) => i.list === list && i.done);
  if (done.length === 0) return [];
  const batch = writeBatch(db());
  for (const item of done) batch.delete(doc(itemsOf(id), item.id));
  quietly(batch.commit());
  return done;
}
