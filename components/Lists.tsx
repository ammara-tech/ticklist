"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import ItemRow from "@/components/ItemRow";
import { addItem, clearDone, removeItem, restoreItems } from "@/lib/actions";
import { categoryInfo } from "@/lib/categories";
import { counts, doneItems, shoppingAisles, sortedChores } from "@/lib/items";
import { memberList } from "@/lib/members";
import { useApp } from "@/lib/store";
import type { Item, ListName } from "@/lib/types";

/*
  The two lists, Shopping and Chores, on one screen with tabs.
  - Shopping is sorted into shop aisles (lib/categories.ts), so you walk through the shop once.
  - Chores show who's doing each one, yours first.
  - Ticked things move to "Done", where you can untick them or clear them all (with Undo).
  Press "/" to jump to the Add box.
*/

const TAB_KEY = "ticklist:tab";

export default function Lists() {
  const { household, items, uid } = useApp();
  const [tab, setTab] = useState<ListName>("shopping");
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [undo, setUndo] = useState<{ text: string; items: Item[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());
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

  if (!household || !uid) return null;

  function choose(next: ListName) {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {}
  }

  function add(e: FormEvent) {
    e.preventDefault();
    if (addItem(tab, text, assignee)) setText("");
    input.current?.focus();
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

  const n = counts(items);
  const done = doneItems(items, tab);
  const people = memberList(household, uid);
  const rowProps = { household, me: uid, now, onDelete: remove };

  return (
    <div>
      <h1 className="sr-only">{household.name}: shopping and chores</h1>

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
            placeholder={tab === "shopping" ? "Add, e.g. 2 milk" : "Add a chore, e.g. Bins out"}
            className="field min-w-0 flex-1 basis-56 py-3"
          />
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
          {tab === "shopping" ? "Amounts work too: \"500g mince\" or \"bread x2\". Things are sorted into shop aisles for you." : "Tap the initials on a chore to change who's doing it."}{" "}
          <span className="hidden sm:inline">Press / to add.</span>
        </p>

        {/* The list */}
        <div className="mt-6 space-y-6">
          {tab === "shopping" ? (
            shoppingAisles(items).map((aisle) => (
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
          ) : sortedChores(items, uid).length > 0 ? (
            <ul className="ruled rounded-2xl border border-line bg-card px-3">
              {sortedChores(items, uid).map((item) => (
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    clear();
                  }}
                  className="ml-auto rounded-lg px-3 py-1 text-sm font-semibold text-basil hover:bg-basil-soft"
                >
                  Clear
                </button>
              </summary>
              <ul className="ruled pb-2">
                {done.map((item) => (
                  <ItemRow key={item.id} item={item} {...rowProps} />
                ))}
              </ul>
            </details>
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
