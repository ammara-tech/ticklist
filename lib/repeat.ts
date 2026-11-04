import type { Household, Item } from "@/lib/types";

/*
  Repeating chores: "Bins out, every week". When you tick one it goes to Done like any
  chore, but it remembers when it's due again (dueAt), and on that day it's back on the
  list by itself, for everyone. Nothing has to run on a server: every phone works out
  "is it due yet?" from the time. With "Take turns", each time it's done it moves on to
  the next person in the household. Tested in tests/repeat.test.ts.
*/

export const REPEAT_OPTIONS = [0, 1, 2, 3, 7, 14, 28] as const;
export type RepeatDays = (typeof REPEAT_OPTIONS)[number];

export function repeatLabel(days: number) {
  switch (days) {
    case 0:
      return "Once";
    case 1:
      return "Every day";
    case 7:
      return "Every week";
    case 14:
      return "Every 2 weeks";
    case 28:
      return "Every 4 weeks";
    default:
      return `Every ${days} days`;
  }
}

/** The start of the day `days` days after `ms`, on this phone's clock: it's back that morning */
export function dueAfter(ms: number, days: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days); // by date, not 24-hour steps, so a clock change can't move the day
  return d.getTime();
}

/** A repeating chore that was done and isn't due again yet */
export function isWaiting(item: Pick<Item, "done" | "repeatDays" | "dueAt">, now: number) {
  return item.done && item.repeatDays > 0 && item.dueAt !== null && now < item.dueAt;
}

/** On the list to do: not done, or a repeating chore that's due again */
export function isOpen(item: Pick<Item, "done" | "repeatDays" | "dueAt">, now: number) {
  return !item.done || (item.repeatDays > 0 && item.dueAt !== null && now >= item.dueAt);
}

/** Who does a chore next when taking turns: the next person after whoever just did it */
export function nextInTurn(household: Pick<Household, "memberIds">, current: string, doneBy: string) {
  const ids = household.memberIds;
  if (ids.length === 0) return current;
  const from = ids.indexOf(current || doneBy);
  return ids[(from + 1) % ids.length] ?? ids[0];
}

/** The changes to save when a chore is ticked off (or a shopping item is) */
export function tickChanges(item: Item, me: string, now: number, household: Pick<Household, "memberIds">) {
  const repeating = item.list === "chores" && item.repeatDays > 0;
  return {
    done: true,
    doneBy: me,
    doneAt: now,
    dueAt: repeating ? dueAfter(now, item.repeatDays) : null,
    ...(repeating && item.rotate ? { assignee: nextInTurn(household, item.assignee, me) } : {}),
  };
}

/** "Back today", "Back tomorrow", "Back Tue 10 Nov" */
export function backWhen(dueAt: number, now: number) {
  const days = Math.round((dueAfter(dueAt, 0) - dueAfter(now, 0)) / 86_400_000);
  if (days <= 0) return "Back today";
  if (days === 1) return "Back tomorrow";
  // Written out by hand, so it reads "Back Tue 10 Nov" on every phone
  const d = new Date(dueAt);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `Back ${weekday} ${d.getDate()} ${month}`;
}

/** A short label for the badge on a chore: "Weekly", "Every 2 days" */
export function shortRepeat(days: number) {
  return days === 1 ? "Daily" : days === 7 ? "Weekly" : days === 14 ? "Every 2 weeks" : days === 28 ? "Every 4 weeks" : `Every ${days} days`;
}

/** The choices in a Repeat picker: once, or each repeat with and without taking turns ("7", "7t") */
export const REPEAT_CHOICES = [
  { value: "0", label: "Once" },
  ...REPEAT_OPTIONS.filter((d) => d > 0).flatMap((d) => [
    { value: `${d}`, label: repeatLabel(d) },
    { value: `${d}t`, label: `${repeatLabel(d)}, taking turns` },
  ]),
];

export const repeatValue = (days: number, rotate: boolean) => (days > 0 ? `${days}${rotate ? "t" : ""}` : "0");

export function readRepeatValue(value: string): { repeatDays: number; rotate: boolean } {
  const days = Number.parseInt(value, 10);
  const ok = (REPEAT_OPTIONS as readonly number[]).includes(days) ? days : 0;
  return { repeatDays: ok, rotate: ok > 0 && value.endsWith("t") };
}
