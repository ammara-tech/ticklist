"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ItemRow from "@/components/ItemRow";
import { addItem, clearDone, removeItem, restoreItems, setAtShop } from "@/lib/actions";
import { atShop } from "@/lib/household";
import { categoryInfo } from "@/lib/categories";
import { counts, doneItems, listMessage, quickAdd, shoppingAisles, shoppingTotals, sortedChores } from "@/lib/items";
import { formatRand, lastMonths } from "@/lib/money";
import { REPEAT_CHOICES, readRepeatValue } from "@/lib/repeat";
import { memberList } from "@/lib/members";
import { useApp } from "@/lib/store";
import type { Item, ListName } from "@/lib/types";

/*
  The two lists, Shopping and Chores, on one screen with tabs.
  - Shopping is sorted into shop aisles (lib/categories.ts), so you walk through the shop once.
  - Shopping items can have a price ("2 milk R32,99"): the list shows what's still to buy and
    what's in the trolley, and "Spent per month" keeps the totals even after you clear the trolley.
  - Chores show who's doing each one, yours first. A chore can repeat (lib/repeat.ts), and
    people can take turns.
  - Ticked things move to "Done", where you can untick them or clear them all (with Undo).
  - Type several things at once with commas or new lines ("milk, bread, eggs").
  - Quick add: one tap for things you buy often (lib/items.ts).
  - "I'm at the shop" tells everyone, so they can add what they need in time (lib/household.ts).
  - "Send the list" sends the shopping list on WhatsApp to someone without the app.
  Press "/" to jump to the Add box.
*/

const TAB_KEY = "ticklist:tab";

export default function Lists() {
  const { household, items, uid } = useApp();
  const [tab, setTab] = useState<ListName>("shopping");
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [repeat, setRepeatChoice] = useState("0");
  const [undo, setUndo] = useState<{ text: string; items: Item[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [added, setAdded] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Remember the tab on this phone
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved === "shopping" || saved === "chores") setTab(saved);
    } catch {}
  }, []);

  // "5 min ago" keeps up to date
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // "/" jumps to the Add box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // "Added 3 things" fades after a moment
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), 2500);
    return () => clearTimeout(t);
  }, [added]);

  if (!household || !uid) return null;

  function choose(next: ListName) {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {}
  }

  function add(e: FormEvent) {
    e.preventDefault();
    const r = readRepeatValue(repeat);
    const added = addItem(tab, text, assignee, r.repeatDays, r.rotate);
    if (added) {
      setText("");
      if (added > 1) setAdded(`Added ${added} things`);
    }
    input.current?.focus();
  }

  function sendList() {
    const message = listMessage(household!.name, items, Date.now());
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      navigator.share({ text: message }).catch(() => {});
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function offerUndo(message: string, removed: Item[]) {
    if (removed.length === 0) return;
    clearTimeout(undoTimer.current);
    setUndo({ text: message, items: removed });
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  }

  function remove(item: Item) {
    removeItem(item);
    offerUndo(`Deleted ${item.text}`, [item]);
  }

  function clear() {
    const removed = clearDone(tab);
    offerUndo(`Cleared ${removed.length} ${removed.length === 1 ? "item" : "items"}`, removed);
  }

  const n = counts(items, now);
  const done = doneItems(items, tab, now);
  const money = shoppingTotals(items, now);
  const months = lastMonths(household.spent, now);
  const topMonth = Math.max(...months.map((m) => m.amount), 1);
  const clearable = done.filter((i) => !(i.repeatDays > 0)).length;
  const people = memberList(household, uid);
  const rowProps = { household, me: uid, now, onDelete: remove };
  const shoppers = atShop(household, now);
  const imAtShop = shoppers.some((p) => p.uid === uid);
  const othersAtShop = shoppers.filter((p) => p.uid !== uid);
  const suggestions = tab === "shopping" ? quickAdd(items, now) : [];
  const alone = household.memberIds.length === 1;

  return (
    <div>
      <h1 className="sr-only">{household.name}: shopping and chores</h1>

      {/* Someone else is at the shop */}
      {othersAtShop.length > 0 && (
        <p role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-basil/40 bg-basil-soft px-4 py-3 text-sm font-semibold">
          <Icon name="cart" className="h-5 w-5 shrink-0 text-basil" />
          <span>
            {othersAtShop.map((p) => p.name).join(" and ")} {othersAtShop.length === 1 ? "is" : "are"} at the shop. Add what you need now!
          </span>
        </p>
      )}

      {/* Just you so far: invite the others */}
      {alone && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm">
          <Icon name="people" className="h-5 w-5 shrink-0 text-plum" />
          <span className="flex-1">It&apos;s just you in {household.name} so far. Invite the people you live with to share the lists.</span>
          <Link href="/household" className="btn-quiet px-3 py-1.5 text-sm">
            Invite people
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Lists" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-1">
        {(
          [
            ["shopping", "Shopping", "cart", n.shopping],
            ["chores", "Chores", "broom", n.chores],
          ] as const
        ).map(([id, label, icon, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="list-panel"
            onClick={() => choose(id)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition ${
              tab === id ? (id === "shopping" ? "bg-basil text-on-basil" : "bg-plum text-card") : "text-ink-soft hover:text-ink"
            }`}
          >
            <Icon name={icon} />
            {label}
            <span className={`rounded-full px-2 text-xs ${tab === id ? "bg-white/25" : "bg-page"}`}>{count}</span>
          </button>
        ))}
      </div>

      <div id="list-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {/* Add */}
        <form onSubmit={add} className="mt-5 flex flex-wrap gap-2">
          <label htmlFor="add" className="sr-only">
            {tab === "shopping" ? "Add to the shopping list" : "Add a chore"}
          </label>
          <input
            id="add"
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            autoComplete="off"
            enterKeyHint="done"
            placeholder={tab === "shopping" ? "Add, e.g. 2 milk, bread, eggs" : "Add a chore, e.g. Bins out"}
            className="field min-w-0 flex-1 basis-56 py-3"
          />
          {tab === "chores" && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-ink-soft">Repeat</span>
              <select value={repeat} onChange={(e) => setRepeatChoice(e.target.value)} className="field w-auto py-3">
                {REPEAT_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tab === "chores" && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-ink-soft">For</span>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="field w-auto py-3">
                <option value="">Anyone</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === uid ? `${p.name} (you)` : p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className={`btn py-3 ${tab === "chores" ? "!bg-plum !text-card" : ""}`}>
            <Icon name="plus" />
            Add
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-soft">
          {tab === "shopping"
            ? "Add several at once with commas. Amounts and prices work too: \"500g mince\", \"bread x2\" or \"2 milk R32,99\". Things are sorted into shop aisles for you."
            : "Tap the initials on a chore to change who's doing it, or the arrows to make it repeat."}{" "}
          <span className="hidden sm:inline">Press / to add.</span>
          {added && (
            <span role="status" className="ml-2 font-semibold text-basil">
              {added}
            </span>
          )}
        </p>

        {/* Quick add: one tap for things you buy often */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p id="quick-add" className="text-xs font-bold uppercase tracking-widest text-ink-soft">
              Quick add
            </p>
            <ul aria-labelledby="quick-add" className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => addItem("shopping", s)}
                    className="flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-basil hover:text-basil"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    {s}
                    <span className="sr-only"> to the shopping list</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* At the shop, and sending the list */}
        {tab === "shopping" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAtShop(!imAtShop)}
              className={imAtShop ? "btn py-2.5" : "btn-quiet py-2.5"}
            >
              <Icon name={imAtShop ? "check" : "cart"} />
              {imAtShop ? "I'm done shopping" : "I'm at the shop"}
            </button>
            {n.shopping > 0 && (
              <button type="button" onClick={sendList} className="btn-quiet py-2.5">
                <Icon name="whatsapp" />
                Send the list
              </button>
            )}
          </div>
        )}

        {/* What it adds up to, when items have prices */}
        {tab === "shopping" && (money.toBuy > 0 || money.inTrolley > 0) && (
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
            <span>
              Still to buy: <strong>{formatRand(money.toBuy)}</strong>
              {money.priced < money.open && (
                <span className="text-ink-soft">
                  {" "}
                  ({money.priced} of {money.open} items priced)
                </span>
              )}
            </span>
            {money.inTrolley > 0 && (
              <span>
                In the trolley: <strong>{formatRand(money.inTrolley)}</strong>
              </span>
            )}
          </p>
        )}

        {/* The list */}
        <div className="mt-6 space-y-6">
          {tab === "shopping" ? (
            shoppingAisles(items, now).map((aisle) => (
              <section key={aisle.id} aria-labelledby={`aisle-${aisle.id}`}>
                <h2 id={`aisle-${aisle.id}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-soft">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: categoryInfo(aisle.id).colour }} />
                  {aisle.label}
                  <span className="font-semibold normal-case tracking-normal">· {aisle.items.length}</span>
                </h2>
                <ul className="ruled mt-1 rounded-2xl border border-line bg-card px-3">
                  {aisle.items.map((item) => (
                    <ItemRow key={item.id} item={item} {...rowProps} />
                  ))}
                </ul>
              </section>
            ))
          ) : sortedChores(items, uid, now).length > 0 ? (
            <ul className="ruled rounded-2xl border border-line bg-card px-3">
              {sortedChores(items, uid, now).map((item) => (
                <ItemRow key={item.id} item={item} {...rowProps} />
              ))}
            </ul>
          ) : null}

          {(tab === "shopping" ? n.shopping : n.chores) === 0 && (
            <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
              <p className="text-lg font-bold">{tab === "shopping" ? "Nothing to buy" : "No chores waiting"}</p>
              <p className="mt-1 text-ink-soft">
                {done.length > 0
                  ? tab === "shopping"
                    ? "Everything's in the trolley. Well done!"
                    : "Everything's done. Time for tea."
                  : tab === "shopping"
                    ? "Add what you need above. Everyone in the household sees it straight away."
                    : "Add a chore above and choose who's doing it."}
              </p>
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <details open className="group rounded-2xl border border-line bg-card/60 px-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 py-3 font-bold">
                <Icon name="chevron" className="h-4 w-4 transition group-open:rotate-90" />
                {tab === "shopping" ? "In the trolley" : "Done"} <span className="text-ink-soft">({done.length})</span>
                {clearable > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      clear();
                    }}
                    title={tab === "chores" ? "Repeating chores stay, waiting to come back" : undefined}
                    className="ml-auto rounded-lg px-3 py-1 text-sm font-semibold text-basil hover:bg-basil-soft"
                  >
                    Clear
                  </button>
                )}
              </summary>
              <ul className="ruled pb-2">
                {done.map((item) => (
                  <ItemRow key={item.id} item={item} {...rowProps} />
                ))}
              </ul>
            </details>
          )}

          {/* Spent per month: what was ticked off with a price, kept even after the trolley is cleared */}
          {tab === "shopping" && months.some((m) => m.amount > 0) && (
            <section aria-labelledby="spent-title" className="rounded-2xl border border-line bg-card p-4">
              <h2 id="spent-title" className="font-bold">
                Spent per month
              </h2>
              <p className="text-xs text-ink-soft">Shopping with a price, ticked off by anyone in the household.</p>
              <div aria-hidden="true" className="mt-4 flex h-28 items-end gap-2">
                {months.map((m) => (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t-md bg-basil" style={{ height: `${Math.max(m.amount ? 6 : 2, (m.amount / topMonth) * 100)}%`, opacity: m.amount ? 1 : 0.25 }} />
                    <span className="text-[11px] text-ink-soft">{m.label}</span>
                  </div>
                ))}
              </div>
              {/* The same numbers for screen readers (and anyone who wants the exact amounts) */}
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Spent per month</caption>
                <tbody>
                  {months
                    .filter((m) => m.amount > 0)
                    .reverse()
                    .map((m) => (
                      <tr key={m.key} className="border-t border-line">
                        <th scope="row" className="py-1 text-left font-normal text-ink-soft">
                          {m.label} {m.key.slice(0, 4)}
                        </th>
                        <td className="py-1 text-right font-semibold">{formatRand(m.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>

      {/* Undo for deleting and clearing */}
      {undo && (
        <div role="status" className="rise fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-4 rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold shadow-lg">
          <span>{undo.text}</span>
          <button
            type="button"
            onClick={() => {
              restoreItems(undo.items);
              setUndo(null);
            }}
            className="font-extrabold uppercase tracking-wider text-basil hover:underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
