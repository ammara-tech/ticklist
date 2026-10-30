"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { createHousehold, leaveHousehold, newInviteLink, readHouseholdName, renameHousehold, setMyName, switchHousehold } from "@/lib/actions";
import { signOutUser } from "@/lib/auth";
import { codeFromInput, inviteLink, inviteMessage } from "@/lib/invite";
import { memberList } from "@/lib/members";
import { useApp } from "@/lib/store";

/*
  /household: everything about the household and you.
  The invite link, who's in it, its name, your name, switching between households
  (e.g. home and a holiday house), and leaving.
*/
export default function HouseholdPage() {
  const { household, profile, uid } = useApp();
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  if (!household || !uid) return null;

  const link = origin ? inviteLink(origin, household.inviteCode) : "";
  const people = memberList(household, uid);
  const alone = household.memberIds.length === 1;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it instead.");
    }
  }

  async function act(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
    } catch {
      setError("That didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your household</h1>
      {error && (
        <p role="alert" className="rounded-xl border border-tomato/40 bg-card px-4 py-3 text-sm font-semibold text-tomato">
          {error}
        </p>
      )}

      {/* Name */}
      <Panel title="Household name">
        <InlineForm label="Household name" value={household.name} onSave={renameHousehold} />
      </Panel>

      {/* Invite */}
      <Panel title="Invite people" hint="Anyone with this link can join after signing in. Send it only to people you live with.">
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="invite-link">
            Invite link
          </label>
          <input id="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} className="field min-w-0 flex-1 basis-64 font-mono text-sm" />
          <button type="button" onClick={copy} className="btn">
            <Icon name={copied ? "check" : "copy"} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(inviteMessage(household.name, link))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-quiet"
          >
            <Icon name="whatsapp" />
            Send on WhatsApp
          </a>
          {confirmNew ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              The old link will stop working.
              <button type="button" disabled={busy} onClick={() => act(newInviteLink, () => setConfirmNew(false))} className="btn px-3 py-2">
                Make a new link
              </button>
              <button type="button" onClick={() => setConfirmNew(false)} className="btn-quiet px-3 py-2">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmNew(true)} className="btn-quiet">
              <Icon name="refresh" />
              New link
            </button>
          )}
        </div>
      </Panel>

      {/* Members */}
      <Panel title={`Members (${people.length})`}>
        <ul className="divide-y divide-line">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <Avatar uid={p.id} name={p.name} size="h-10 w-10 text-sm" />
              <span className="flex-1">
                <span className="block font-semibold">
                  {p.name} {p.id === uid && <span className="font-normal text-ink-soft">(you)</span>}
                </span>
                {p.joinedAt > 0 && (
                  <span className="block text-xs text-ink-soft">
                    Joined {new Date(p.joinedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* You */}
      <Panel title="Your name" hint="This is how you appear to the others, e.g. &quot;Lerato ticked Milk&quot;.">
        <InlineForm label="Your name" value={profile.name} onSave={setMyName} />
      </Panel>

      {/* Households */}
      <Panel title="Your households" hint="Use more than one for different homes, like a holiday house or your parents' place.">
        <ul className="divide-y divide-line">
          {profile.households.map((id) => (
            <li key={id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 font-semibold">{id === household.id ? household.name : <OtherHousehold id={id} />}</span>
              {id === household.id ? (
                <span className="text-sm font-semibold text-basil">Open now</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    switchHousehold(id);
                    router.push("/");
                  }}
                  className="btn-quiet px-3 py-1.5 text-sm"
                >
                  Switch
                </button>
              )}
            </li>
          ))}
        </ul>
        <AddHousehold onError={setError} />
      </Panel>

      {/* Leave and sign out */}
      <Panel title="Leave or sign out">
        <div className="flex flex-wrap gap-2">
          {confirmLeave ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              {alone ? "You're the only member, so the household and its lists will be deleted." : "You'll lose access to these lists until someone invites you again."}
              <button
                type="button"
                disabled={busy}
                onClick={() => act(leaveHousehold, () => router.push("/"))}
                className="btn px-3 py-2 !bg-tomato !text-white"
              >
                {alone ? "Delete and leave" : "Yes, leave"}
              </button>
              <button type="button" onClick={() => setConfirmLeave(false)} className="btn-quiet px-3 py-2">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmLeave(true)} className="btn-quiet !text-tomato hover:!border-tomato">
              Leave {household.name}
            </button>
          )}
          <button type="button" onClick={() => signOutUser()} className="btn-quiet">
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* A text box with a Save button that appears once you've changed it */
function InlineForm({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const changed = draft.trim() !== value && draft.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!changed) return;
        onSave(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className="flex flex-wrap gap-2"
    >
      <label className="sr-only" htmlFor={label}>
        {label}
      </label>
      <input id={label} value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)} className="field min-w-0 flex-1 basis-56" />
      <button type="submit" disabled={!changed} className="btn">
        {saved ? "Saved" : "Save"}
      </button>
    </form>
  );
}

/* The name of a household you're in but not looking at right now */
function OtherHousehold({ id }: { id: string }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    readHouseholdName(id).then((n) => live && setName(n));
    return () => {
      live = false;
    };
  }, [id]);
  return <>{name ?? <span className="text-ink-soft">Another household</span>}</>;
}

/* Start another household, or join one with a link */
function AddHousehold({ onError }: { onError: (e: string | null) => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "start" | "join">("none");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    onError(null);
    if (mode === "join") {
      const code = codeFromInput(value);
      if (!code) return onError("That doesn't look like a TickList invite link. Paste the whole link, or the 12-letter code.");
      return router.push(`/join?code=${code}`);
    }
    setBusy(true);
    try {
      await createHousehold(value);
      router.push("/");
    } catch {
      onError("Couldn't create the household. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "none") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("start")} className="btn-quiet">
          <Icon name="plus" />
          Start another
        </button>
        <button type="button" onClick={() => setMode("join")} className="btn-quiet">
          <Icon name="link" />
          Join with a link
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="add-household">
        {mode === "start" ? "New household's name" : "Invite link or code"}
      </label>
      <input
        id="add-household"
        autoFocus
        required
        maxLength={mode === "start" ? 30 : 200}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === "start" ? "e.g. Holiday house" : "Paste the invite link"}
        className="field min-w-0 flex-1 basis-56"
      />
      <button type="submit" disabled={busy} className="btn">
        {mode === "start" ? "Create" : "Join"}
      </button>
      <button type="button" onClick={() => setMode("none")} className="btn-quiet">
        Cancel
      </button>
    </form>
  );
}
