"use client";

import { useState, type FormEvent } from "react";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { assignChore, editItem, toggleItem } from "@/lib/actions";
import { timeAgo } from "@/lib/items";
import { memberList, nameFor } from "@/lib/members";
import { qtyLabel } from "@/lib/parse";
import type { Household, Item } from "@/lib/types";

/*
  One line on a list: a big round tick box (easy to hit with a thumb in the shop),
  the item and its amount, and Edit / Delete. Ticking draws the tick and flashes
  mustard for a moment before the item moves down to "Done", so you can see it worked.
*/
export default function ItemRow({
  item,
  household,
  me,
  now,
  onDelete,
}: {
  item: Item;
  household: Household;
  me: string;
  now: number;
  onDelete: (item: Item) => void;
}) {
  const [ticking, setTicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const checked = item.done || ticking;
  const label = `${item.text}${item.qty ? `, ${item.qty}` : ""}`;

  function tick() {
    if (ticking) return;
    if (item.done) return toggleItem(item);
    setTicking(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => toggleItem(item), reduced ? 0 : 450);
  }

  function startEdit() {
    setDraft(`${item.qty ? `${item.qty} ` : ""}${item.text}`);
    setEditing(true);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    editItem(item, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-2">
        <form onSubmit={save} className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`edit-${item.id}`}>
            Edit {item.text}
          </label>
          <input
            id={`edit-${item.id}`}
            autoFocus
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            className="field py-2"
          />
          <button type="submit" className="btn px-4 py-2">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="tool" aria-label="Cancel editing">
            <Icon name="close" />
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className={`group flex items-center gap-3 rounded-lg py-1.5 ${ticking ? "just-ticked" : ""}`}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5">
        <input type="checkbox" checked={checked} onChange={tick} className="peer sr-only" aria-label={item.done ? `Untick ${label}` : `Tick ${label}`} />
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-basil ${
            checked ? "border-basil bg-basil text-on-basil" : "border-line bg-card group-hover:border-basil"
          }`}
        >
          {checked && (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" className={ticking ? "tick-draw" : ""} />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[17px] font-semibold leading-snug [overflow-wrap:anywhere] ${item.done ? "text-ink-soft line-through decoration-2" : ""}`}>{item.text}</span>
          {item.done && item.doneAt && (
            <span className="block text-xs text-ink-soft">
              {nameFor(item.doneBy, household, me)} · {timeAgo(item.doneAt, now)}
            </span>
          )}
        </span>
        {item.qty && <span className="shrink-0 rounded-full bg-basil-soft px-2.5 py-0.5 text-sm font-bold text-basil">{qtyLabel(item.qty)}</span>}
      </label>

      {item.list === "chores" && !item.done && <ChoreFor item={item} household={household} me={me} />}

      {!item.done && (
        <button type="button" onClick={startEdit} className="tool h-9 min-w-9" aria-label={`Edit ${item.text}`} title="Edit">
          <Icon name="pencil" className="h-4 w-4" />
        </button>
      )}
      <button type="button" onClick={() => onDelete(item)} className="tool h-9 min-w-9 hover:!bg-tomato/10 hover:!text-tomato" aria-label={`Delete ${item.text}`} title="Delete">
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </li>
  );
}

/* Who's doing a chore: a small picker showing their initials */
function ChoreFor({ item, household, me }: { item: Item; household: Household; me: string }) {
  const people = memberList(household, me);
  const who = item.assignee ? household.members[item.assignee] : null;
  return (
    <label className="relative flex shrink-0 items-center" title="Who's doing it">
      <span className="sr-only">Who&apos;s doing {item.text}</span>
      {who ? (
        <Avatar uid={item.assignee} name={who.name} size="h-7 w-7 text-[11px]" />
      ) : (
        <span aria-hidden="true" className="rounded-full border border-dashed border-plum/60 px-2 py-0.5 text-xs font-semibold text-plum">
          Anyone
        </span>
      )}
      <select
        value={who ? item.assignee : ""}
        onChange={(e) => assignChore(item, e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">Anyone</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id === me ? `${p.name} (you)` : p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
