"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInDemo, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The sign-in screen is a fridge door: the form is a yellow sticky note held up by magnets,
  next to a shopping list being ticked off and a green "Try the demo" note. On a phone the
  sign-in note comes first. Someone who opened an invite link sees a note that they'll join
  after signing in.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Opened from a "Try the demo" link (…/?demo): the demo box goes to the top
  const [fromDemoLink, setFromDemoLink] = useState(false);
  useEffect(() => {
    setFromDemoLink(new URLSearchParams(window.location.search).has("demo"));
  }, []);

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

  // "Try the demo" is a green note on the fridge
  const demoBox = (
    <div className="relative rounded-sm bg-[#d9f2d0] px-5 pb-5 pt-7 text-[#1f2a1a] shadow-[0_22px_40px_-22px_rgba(0,0,0,0.45)] dark:bg-[#26381f] dark:text-[#e3f2dc] sm:rotate-[1.5deg]">
      <span aria-hidden="true" className="magnet left-1/2 -ml-[13px] bg-[#f2c14e]" />
      <p className="font-hand text-3xl leading-none">Just looking?</p>
      <p className="mt-2 text-sm">Try TickList with a made-up household, a shopping list and chores. No account needed, and everything is deleted when you end the demo.</p>
      <button type="button" disabled={busy} onClick={() => run(signInDemo)} className="btn mt-3 w-full py-2.5">
        Try the demo
      </button>
    </div>
  );

  return (
    <div className="fridge relative min-h-screen overflow-hidden">
      {/* The fridge handle, down the right-hand side (decoration) */}
      <span aria-hidden="true" className="absolute right-6 top-1/4 hidden h-72 w-3 rounded-full bg-gradient-to-b from-[#c9d1cf] via-white to-[#b7c0be] shadow-md dark:from-[#3a3f40] dark:via-[#5a6062] dark:to-[#2c3031] lg:block" />

      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <p className="flex items-center gap-2 text-xl font-extrabold">
          <Logo className="h-9 w-9 -rotate-6" />
          TickList
        </p>
        <ThemeToggle />
      </div>

      <div className="mx-auto grid max-w-5xl items-start gap-12 px-5 pb-16 pt-4 lg:grid-cols-[1fr_minmax(0,26rem)] lg:pt-10">
        {/* The sign-in form is a sticky note, held up by two magnets */}
        <main className="sticky-note order-1 rounded-sm px-6 pb-8 pt-10 sm:px-8 lg:order-2 lg:rotate-[1deg]">
          <span aria-hidden="true" className="magnet left-8 bg-[#d6452a]" />
          <span aria-hidden="true" className="magnet right-8 bg-[#3a7bd5]" />
          {fromDemoLink && <div className="mb-8">{demoBox}</div>}
          {invited && (
            <p className="mb-6 rounded-xl border border-basil/40 bg-card px-4 py-3 text-sm">
              <strong>You&apos;ve been invited to a household.</strong> Sign in or create an account, and you&apos;ll join it straight after.
            </p>
          )}
          <h1 className="font-hand text-5xl leading-none">{mode === "signIn" ? "Welcome back!" : "Make an account"}</h1>
          <p className="mt-3 text-ink-soft">{mode === "signIn" ? "Sign in to see your lists." : "It's free, and takes a minute."}</p>

          <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-6 w-full py-3">
            <Icon name="google" />
            Continue with Google
          </button>

          <p className="my-5 flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-note-edge after:h-px after:flex-1 after:bg-note-edge">or</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-bold">
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1 font-normal" />
            </label>
            <div>
              <label htmlFor="password" className="text-sm font-bold">
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
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-bold text-basil hover:bg-basil-soft"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <div role="alert" className="text-sm font-bold text-tomato">
                <p>{error.text}</p>
                {error.code && <p className="mt-1 text-xs font-normal opacity-80">Error code: {error.code}</p>}
              </div>
            )}
            {notice && (
              <p role="status" className="text-sm font-bold text-basil">
                {notice}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn w-full py-3">
              {mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signIn" && (
            <button type="button" onClick={forgot} className="mt-4 text-sm font-bold text-basil hover:underline">
              Forgot your password?
            </button>
          )}

          <p className="mt-6 text-ink-soft">
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
        </main>

        {/* The rest of the fridge door: what TickList is, a shopping list someone is ticking off, and the demo */}
        <div className="order-2 lg:order-1">
          <p className="font-hand text-5xl leading-[0.95] sm:text-6xl">One list for the whole house.</p>
          <p className="mt-4 max-w-md text-lg text-ink-soft">
            Shopping and chores, shared with your family or flatmates. Tick off the milk and it&apos;s gone from everyone&apos;s phone. Works with no signal in the shop.
          </p>
          <FridgeList />
          {!fromDemoLink && <div className="mt-10 max-w-sm">{demoBox}</div>}
        </div>
      </div>
    </div>
  );
}

/*
  A shopping list on lined paper, as a preview on the sign-in screen: some things ticked off in
  red pen, and one ticked by someone else just now. Decorative only: screen readers skip it.
*/
function FridgeList() {
  const items: [string, boolean, string?][] = [
    ["Milk (2 L)", true],
    ["Bread", true, "Thabo, just now"],
    ["Eggs", false],
    ["Washing powder", false],
    ["Tomatoes", false],
  ];
  return (
    <div aria-hidden="true" className="relative mt-10 hidden w-72 -rotate-2 rounded-sm bg-white px-6 pb-6 pt-8 text-[#2a2416] shadow-[0_22px_40px_-22px_rgba(0,0,0,0.45)] dark:bg-[#2b2a22] dark:text-[#f4eedb] sm:block">
      <span className="magnet left-1/2 -ml-[13px] bg-[#6d4c8d]" />
      <p className="font-hand text-3xl">Shopping</p>
      <ul className="mt-2">
        {items.map(([text, done, who]) => (
          <li key={text} className="flex items-center gap-3 border-b border-[#9cc3e6]/60 py-1.5">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${done ? "border-[#b5321c] text-[#b5321c] dark:border-[#ff9a7c] dark:text-[#ff9a7c]" : "border-current opacity-40"}`}>
              {done && "✓"}
            </span>
            <span className={done ? "line-through opacity-60" : ""}>{text}</span>
            {who && <span className="ml-auto text-xs font-bold text-[#b5321c] dark:text-[#ff9a7c]">{who}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
