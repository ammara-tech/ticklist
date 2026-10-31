"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The sign-in screen. On a laptop the green side shows three small example cards
  (shopping, chores and inviting), so people see what TickList does before they sign up.
  Someone who opened an invite link sees a note that they'll join after signing in.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const invited = usePathname() === "/join"; // the same on the server and in the browser

  // If Google sign-in went the full-page way and failed, say why when the page comes back.
  useEffect(() => {
    finishRedirectSignIn().catch((e) => {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e);
    });
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e); // the code, for whoever is fixing it
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => (mode === "signIn" ? signInEmail(email, password) : signUpEmail(email, password)));
  }

  async function forgot() {
    if (!email.trim()) {
      setError({ text: "Type your email address first, then press \"Forgot your password?\" again.", code: "" });
      return;
    }
    await run(async () => {
      await resetPassword(email);
      setNotice("If there's an account for that email, a reset link is on its way. Check your inbox.");
    });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#1f5c3a] p-12 text-white lg:flex lg:flex-col">
        <p className="flex items-center gap-2 text-2xl font-extrabold">
          <Logo className="h-9 w-9" />
          TickList
        </p>
        <DemoList />
        <h1 className="relative mt-auto max-w-md text-5xl font-extrabold leading-[1.05] tracking-tight">One list for the whole house.</h1>
        <p className="relative mt-5 max-w-md text-lg text-white/85">
          Shopping and chores, shared with your family or flatmates. Tick off the milk and it&apos;s gone from everyone&apos;s phone. Works with no signal in the shop.
        </p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xl font-extrabold lg:invisible">
            <Logo />
            TickList
          </p>
          <ThemeToggle />
        </div>

        <div className="m-auto w-full max-w-sm py-10">
          {invited && (
            <p className="mb-6 rounded-xl border border-basil/40 bg-basil-soft px-4 py-3 text-sm">
              <strong>You&apos;ve been invited to a household.</strong> Sign in or create an account, and you&apos;ll join it straight after.
            </p>
          )}
          <h2 className="text-3xl font-extrabold tracking-tight">{mode === "signIn" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-2 text-ink-soft">{mode === "signIn" ? "Sign in to see your lists." : "It's free, and takes a minute."}</p>

          <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-8 w-full py-3">
            <Icon name="google" />
            Continue with Google
          </button>

          <p className="my-6 flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1 font-normal" />
            </label>
            <div>
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-basil hover:bg-basil-soft"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <div role="alert" className="text-sm font-semibold text-tomato">
                <p>{error.text}</p>
                {error.code && <p className="mt-1 text-xs font-normal opacity-70">Error code: {error.code}</p>}
              </div>
            )}
            {notice && (
              <p role="status" className="text-sm text-basil">
                {notice}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn w-full py-3">
              {mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signIn" && (
            <button type="button" onClick={forgot} className="mt-4 text-sm font-semibold text-basil hover:underline">
              Forgot your password?
            </button>
          )}

          <p className="mt-8 text-ink-soft">
            {mode === "signIn" ? "New to TickList? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signIn" ? "create" : "signIn");
                setError(null);
                setNotice(null);
              }}
              className="font-bold text-basil hover:underline"
            >
              {mode === "signIn" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-6 text-sm text-ink-soft">Only the people in your household can see your lists. They&apos;re stored in Google&apos;s Firebase database.</p>
        </div>
      </main>
    </div>
  );
}

/*
  Three made-up cards overlapping like notes on a fridge, as a preview on the sign-in screen.
  Each shows something TickList does:
    back:   the shopping list sorted into shop aisles, with someone else's tick arriving live
    middle: the chores list, with who's doing each one
    front:  inviting the household with a link, and still working offline
  Decorative only: screen readers skip it.
*/
const paper = "rounded-2xl bg-[#f7f3ea] p-4 text-[#1d2620] shadow-[0_24px_50px_-18px_rgba(0,0,0,0.55)]";

function Tick({ done, colour = "#2b7349" }: { done: boolean; colour?: string }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white"
      style={done ? { borderColor: colour, background: colour } : { borderColor: "#c9c1ae" }}
    >
      {done && <Icon name="check" className="h-3.5 w-3.5" />}
    </span>
  );
}

function Face({ letter, colour }: { letter: string; colour: string }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: colour }}>
      {letter}
    </span>
  );
}

function DemoList() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-8 h-[400px] w-full max-w-[520px] select-none">
      {/* Shopping, sorted into aisles */}
      <div className={`${paper} absolute left-0 top-0 w-[270px] rotate-[-6deg]`}>
        <p className="flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-1.5">
            <Icon name="cart" className="h-4 w-4 text-[#2b7349]" />
            Shopping
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#2b7349]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2b7349]" />
            Live
          </span>
        </p>
        {(
          [
            ["Fruit & veg", "#3f8f4f", [["Tomatoes", "", false], ["Avos", "×3", false]]],
            ["Dairy & eggs", "#4a7fb8", [["Milk", "×2", true], ["Eggs", "dozen", false]]],
            ["Meat & fish", "#b8473f", [["Boerewors", "1kg", false]]],
          ] as [string, string, [string, string, boolean][]][]
        ).map(([aisle, colour, rows]) => (
          <div key={aisle} className="mt-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#55615a]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: colour }} />
              {aisle}
            </p>
            <ul className="ruled">
              {rows.map(([text, qty, done]) => (
                <li key={text} className="flex items-center gap-2 py-1.5 text-sm">
                  <Tick done={done} />
                  <span className={`flex-1 font-semibold ${done ? "text-[#55615a] line-through" : ""}`}>{text}</span>
                  {qty && <span className="rounded-full bg-[#e1f0e5] px-1.5 text-[10px] font-bold text-[#2b7349]">{qty}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-3 rounded-full bg-[#1d2620] px-3 py-1.5 text-center text-[11px] font-semibold text-[#f7f3ea]">Lerato ticked Milk</p>
      </div>

      {/* Chores, with who's doing each one */}
      <div className={`${paper} absolute left-[44%] top-[16px] w-[250px] rotate-[4deg]`}>
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Icon name="broom" className="h-4 w-4 text-[#6d4c8d]" />
          Chores
        </p>
        <ul className="ruled mt-2">
          {(
            [
              ["Take the bins out", "L", "#c0812b", false],
              ["Wash the dishes", "T", "#4a7fb8", true],
              ["Water the plants", "", "", false],
              ["Feed the dog", "A", "#2f7d4f", false],
            ] as [string, string, string, boolean][]
          ).map(([text, who, colour, done]) => (
            <li key={text} className="flex items-center gap-2 py-1.5 text-sm">
              <Tick done={done} colour="#6d4c8d" />
              <span className={`flex-1 font-semibold ${done ? "text-[#55615a] line-through" : ""}`}>{text}</span>
              {who ? (
                <Face letter={who} colour={colour} />
              ) : (
                <span className="rounded-full border border-dashed border-[#6d4c8d]/60 px-1.5 text-[10px] font-semibold text-[#6d4c8d]">Anyone</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Invite with a link, works offline */}
      <div className={`${paper} absolute bottom-0 left-[30%] w-[240px] rotate-[-2deg]`}>
        <p className="text-sm font-bold">The Dlamini home</p>
        <div className="mt-2 flex -space-x-1.5">
          <Face letter="L" colour="#c0812b" />
          <Face letter="T" colour="#4a7fb8" />
          <Face letter="A" colour="#2f7d4f" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-[#c9c1ae] text-xs font-bold text-[#55615a]">+</span>
        </div>
        <p className="mt-2 truncate rounded-lg border border-[#e2dccd] bg-white px-2 py-1 font-mono text-[10px] text-[#55615a]">ticklist…/join?code=K7QXM2PA9WRT</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-[#2b7349] py-1.5 text-xs font-bold text-white">
          <Icon name="whatsapp" className="h-3.5 w-3.5" />
          Invite on WhatsApp
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#b93a12]">
          <Icon name="cloudOff" className="h-3.5 w-3.5" />
          Offline: 2 ticks will sync when you&apos;re back
        </p>
      </div>
    </div>
  );
}
