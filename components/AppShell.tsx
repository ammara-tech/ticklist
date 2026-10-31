"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { defaultName } from "@/lib/members";
import { connect, disconnect, reportProblem, useApp } from "@/lib/store";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import Logo from "@/components/Logo";
import Toasts from "@/components/Toasts";
import Welcome from "@/components/Welcome";
import Icon from "@/components/Icon";

/*
  Wraps every page. Until someone is signed in, it shows the sign-in screen instead,
  so no list ever loads without an account. After sign-in it connects to their
  household (lib/store.ts). Someone who isn't in a household yet gets the Welcome
  screen, where they start one or join with a link.
  The real protection is in firestore.rules: only members can ever read a household.
*/
export default function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const app = useApp();
  const path = usePathname();
  const user = auth.status === "signedIn" ? auth.user : null;

  useEffect(() => {
    if (user) connect(user.uid, defaultName(user));
    else disconnect();
  }, [user]);

  if (!firebaseConfigured) return <SetupNeeded />;
  // Until Firebase has checked, both screens are on the page and the saved hint picks one
  // (see lib/auth.ts). The sign-in screen stays in the same place, so nothing typed is lost.
  if (auth.status !== "signedIn")
    return (
      <>
        {auth.status === "loading" && (
          <div className="gate-splash">
            <Splash text="Opening TickList…" />
          </div>
        )}
        <div className={auth.status === "loading" ? "gate-login" : undefined}>
          <LoginScreen />
        </div>
      </>
    );
  if (app.status === "loading" && path !== "/join") return <Splash text="Getting your lists…" />;

  // The join page works before you're in a household
  const showWelcome = app.status === "noHousehold" && path !== "/join";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-4 focus:py-2">
        Skip to the list
      </a>
      {app.household && <Header />}
      <main id="main" className="mx-auto max-w-3xl px-4 pb-28 pt-6">
        {!app.online && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm">
            <Icon name="cloudOff" className="mt-0.5 h-4 w-4 shrink-0 text-tomato" />
            <span>
              <strong>You&apos;re offline.</strong> Keep ticking: your changes are saved on this phone and sent to everyone when you&apos;re back online.
            </span>
          </p>
        )}
        {app.problem && (
          <p role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-tomato/40 bg-card px-4 py-3 text-sm">
            <span className="flex-1">{app.problem}</span>
            <button type="button" onClick={() => reportProblem(null)} aria-label="Close" className="text-ink-soft hover:text-ink">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </p>
        )}
        {showWelcome ? <Welcome /> : children}
      </main>
      <Toasts />
    </>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-ink-soft">
      <Logo className="h-14 w-14 motion-safe:animate-bounce" />
      <p role="status">{text}</p>
    </div>
  );
}

/* Shown only to a developer who hasn't added the Firebase settings yet */
function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-extrabold">TickList needs its Firebase settings</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Add the four NEXT_PUBLIC_FIREBASE_ settings to .env.local on your computer and restart npm run dev, or to Vercel&apos;s
        Environment Variables and redeploy. The README explains where to find them.
      </p>
    </div>
  );
}
