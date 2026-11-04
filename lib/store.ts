"use client";

import { useSyncExternalStore } from "react";
import { collection, doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { changesBetween, readItem } from "@/lib/items";
import { householdChanges } from "@/lib/household";
import type { Household, Item, Profile } from "@/lib/types";

/*
  The app's live copy of your household, kept up to date by Firestore.

  connect(uid) listens to three things, live:
    1. your profile (users/{uid}): your name and which households you're in
    2. the household you're looking at (households/{id}): its name and members
    3. its items (households/{id}/items): both lists
  Whenever anyone in the household changes something, Firestore sends the new
  version here within a moment, every screen that uses useApp() re-draws, and a
  message like "Lerato ticked Milk" pops up (changesBetween in lib/items.ts).

  Changes you make show straight away, even offline: Firestore saves them on the
  phone first ("pending") and sends them when the connection is back.
*/

export type Toast = { id: number; text: string };

export type AppState = {
  uid: string | null;
  status: "loading" | "noHousehold" | "ready";
  profile: Profile;
  household: Household | null;
  items: Item[];
  pending: boolean; // changes saved on this phone but not yet sent
  online: boolean;
  toasts: Toast[];
  problem: string | null;
};

const emptyProfile: Profile = { name: "", households: [], current: null };

let state: AppState = {
  uid: null,
  status: "loading",
  profile: emptyProfile,
  household: null,
  items: [],
  pending: false,
  online: true,
  toasts: [],
  problem: null,
};

const listeners = new Set<() => void>();
function set(change: Partial<AppState>) {
  state = { ...state, ...change };
  listeners.forEach((l) => l());
}

let stopProfile: Unsubscribe | null = null;
let stopHousehold: Unsubscribe | null = null;
let stopItems: Unsubscribe | null = null;
let watching: string | null = null; // the household being listened to
let lastItems = new Map<string, Item>();
let firstItems = true;
let pendingParts = { profile: false, household: false, items: false };
let toastId = 0;

/** Your name before you've saved one (from Google, or your email) */
let startingName = "";

function setPending(part: keyof typeof pendingParts, value: boolean) {
  pendingParts = { ...pendingParts, [part]: value };
  set({ pending: pendingParts.profile || pendingParts.household || pendingParts.items });
}

export function addToast(text: string) {
  const toast = { id: ++toastId, text };
  set({ toasts: [...state.toasts, toast].slice(-3) });
  setTimeout(() => dismissToast(toast.id), 4500);
}

export function dismissToast(id: number) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function reportProblem(problem: string | null) {
  set({ problem });
}

function stopWatchingHousehold() {
  clearTimeout(retryTimer);
  stopHousehold?.();
  stopItems?.();
  stopHousehold = stopItems = null;
  watching = null;
  lastItems = new Map();
  firstItems = true;
}

/*
  Right after you create or join a household, Google's servers can take a moment to know
  you're a member, and refuse to show it ("permission denied"). Instead of sending you back
  to the start, the app quietly tries again a few times (retryLater). Only if it still can't
  read it, or the household is gone, does it move you on (lostHousehold).
*/
const RETRY_DELAYS = [400, 800, 1600, 3200];
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function retryLater(id: string) {
  if (retries >= RETRY_DELAYS.length) return false;
  const delay = RETRY_DELAYS[retries++];
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (watching !== id) return;
    watching = null; // so watchHousehold starts again
    watchHousehold(id, true);
  }, delay);
  return true;
}

/** You were removed, or the household was deleted: say so, and move to your next household */
function lostHousehold(id: string) {
  const name = state.household?.id === id ? state.household.name : "that household";
  stopWatchingHousehold();
  set({ household: null, items: [], status: "noHousehold" });
  addToast(`You're no longer in ${name}.`);
  // Imported here, not at the top, because actions.ts imports this file
  import("@/lib/actions").then(({ forgetHousehold }) => forgetHousehold(id));
}

function watchHousehold(id: string, retrying = false) {
  if (watching === id) return;
  stopWatchingHousehold();
  watching = id;
  if (!retrying) retries = 0;
  const { db } = firebase();
  set({ household: null, items: [], status: "loading" });

  stopHousehold = onSnapshot(
    doc(db, "households", id),
    { includeMetadataChanges: true },
    (snap) => {
      setPending("household", snap.metadata.hasPendingWrites);
      const data = snap.data() as Omit<Household, "id"> | undefined;
      if (!data || !state.uid || !data.memberIds.includes(state.uid)) {
        // Only the server's answer counts: a copy saved on this phone may simply be out of date
        if (!snap.metadata.fromCache) lostHousehold(id);
        return;
      }
      retries = 0;
      const next = { id, ...data };
      if (state.uid && state.household?.id === id) {
        for (const text of householdChanges(state.household, next, state.uid, Date.now())) addToast(text);
      }
      set({ household: next, status: "ready" });
    },
    () => {
      // Not allowed to read it: maybe the server doesn't know you're in it yet, so try again first
      if (!retryLater(id)) lostHousehold(id);
    },
  );

  stopItems = onSnapshot(
    collection(db, "households", id, "items"),
    { includeMetadataChanges: true },
    (snap) => {
      setPending("items", snap.metadata.hasPendingWrites);
      const items = snap.docs.map((d) => readItem(d.id, d.data()));
      const next = new Map(items.map((i) => [i.id, i]));
      if (!firstItems && state.uid) {
        for (const text of changesBetween(lastItems, next, state.uid, state.household)) addToast(text);
      }
      firstItems = false;
      lastItems = next;
      set({ items });
    },
    () => set({ items: [] }),
  );
}

const onOnline = () => set({ online: navigator.onLine });

export function connect(uid: string, name: string) {
  if (state.uid === uid) return;
  disconnect();
  startingName = name;
  set({ uid, status: "loading", online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOnline);

  stopProfile = onSnapshot(
    doc(firebase().db, "users", uid),
    { includeMetadataChanges: true },
    (snap) => {
      setPending("profile", snap.metadata.hasPendingWrites);
      const saved = snap.data() as Partial<Profile> | undefined;
      const profile: Profile = {
        name: saved?.name || startingName,
        households: saved?.households ?? [],
        current: saved?.current ?? null,
      };
      const current = profile.current && profile.households.includes(profile.current) ? profile.current : profile.households[0] ?? null;
      set({ profile: { ...profile, current } });
      if (current) watchHousehold(current);
      else {
        stopWatchingHousehold();
        set({ household: null, items: [], status: "noHousehold" });
      }
    },
    () => set({ status: "noHousehold", problem: "Couldn't load your profile. Check your connection and refresh." }),
  );
}

export function disconnect() {
  stopProfile?.();
  stopProfile = null;
  stopWatchingHousehold();
  if (typeof window !== "undefined") {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOnline);
  }
  pendingParts = { profile: false, household: false, items: false };
  set({ uid: null, status: "loading", profile: emptyProfile, household: null, items: [], pending: false, toasts: [], problem: null });
}

export function getApp() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getApp, getApp);
}
