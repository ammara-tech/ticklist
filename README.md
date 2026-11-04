# TickList

**One shopping and chores list for the whole house.** Families and flatmates share one list: tick off the milk
and it's gone from everyone's phone straight away. Invite people with a link, and keep ticking in the shop
with no signal.

**Live site:** [ticklist-pi.vercel.app](https://ticklist-pi.vercel.app)

Built with Next.js, TypeScript, Tailwind CSS and Firebase (Authentication and Cloud Firestore).

## What it does
- **Shared, live lists.** Everyone in a household sees the same Shopping and Chores lists. When someone adds or
  ticks something, it appears on everyone else's phone within a moment, with a message like "Lerato ticked Milk".
- **Sorted into shop aisles.** Shopping is grouped into Fruit & veg, Bakery, Dairy & eggs, Meat & fish, Pantry and
  so on, in the order you'd walk through a South African supermarket. It knows local favourites like boerewors,
  mielie meal, rooibos, chakalaka and Simba chips.
- **Amounts and prices as you type them.** "2 milk", "500g mince", "bread x2" and "eggs (dozen)" are all
  understood, and a price can go at the start or end: "2 milk R32,99" or "R45 bread".
- **What it adds up to.** When items have prices, the Shopping list shows what's **still to buy** and what's
  **in the trolley**, and **Spent per month** shows the last 6 months as bars (with the exact amounts underneath).
  Spending is counted when an item is ticked off, so it's kept even after the trolley is cleared.
- **Chores with names.** Choose who's doing each chore (or "Anyone"). Your chores are listed first.
- **Repeating chores.** Set a chore to come back every day, every 2 or 3 days, every week, every 2 weeks or every
  4 weeks. Once it's ticked, it waits in Done showing "Back tomorrow" or "Back Mon 9 Nov", and on that day it's
  back on the list by itself, for everyone, with no server job needed. With **taking turns**, it moves to the
  next person in the household each time it's done. "Clear" leaves repeating chores alone.
- **Done and Undo.** Ticked things move to "In the trolley" (or "Done"), showing who ticked them and when.
  Untick by mistake, delete with Undo, or clear the whole section with Undo.
- **Invite with a link.** The Household page has your household's invite link: copy it or send it on WhatsApp.
  "New link" makes a fresh one and stops the old one working.
- **Your household.** Rename it, change your name, and leave it; the last person to leave deletes it, with its
  lists and invite link.
- **More than one household.** For example home and a holiday house, with a switcher.
- **Works offline.** The app opens with no signal, and ticks are saved on the phone and sent when you're back online.
  A badge shows Live, Syncing or Offline.
- **Installable.** "Add to Home screen" opens it full screen, like an app.
- **Sign in** with email and password (with a reset email) or Google. If the browser blocks Google's pop-up window, the whole page goes to Google instead. Sign-in errors say what went wrong in plain words, with Firebase's error code underneath. Light and dark themes. Press **/** to add.
- **Fast first load:** a new visitor gets the sign-in screen straight from the server, without waiting for Firebase to load. Someone who has signed in on the device before sees the loading screen instead while Firebase checks (a small hint saved on the device decides which). Google's sign-in helper only loads when someone presses **Continue with Google**, not on every visit.

## Design
A kitchen notepad stuck to the fridge: warm paper, a basil-green tick for "done", a mustard flash when you tick
something, and plum for chores so the two lists never get mixed up. Ticking draws the tick and flashes for a
moment before the item moves down, so you can see it worked. Tick boxes are big enough to hit with a thumb in
the shop. Animations switch off for people who've asked their device to reduce motion.

The sign-in screen shows three made-up cards (shopping, chores and an invite) so visitors see what the app does
before signing up. Font: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque).

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Firebase Authentication, Cloud Firestore,
Vitest, Vercel.

## Project structure
```
app/              Pages: the lists (/), household settings (/household), joining with a link (/join),
                  the app manifest, icons and the light/dark script
components/       The lists, an item row, the sign-in and welcome screens, the header, live messages
lib/              The logic: reading "2 milk R32", shop aisles, grouping, prices, repeating chores, invite codes, names, the live store
                  (store.ts) and every change to the database (actions.ts)
public/sw.js      The service worker that lets the app open offline
firestore.rules   Who can read and change what (runs on Google's servers)
tests/            Unit tests (npm test)
```

## How the important parts work
**Live updates.** `lib/store.ts` listens to your profile, your household and its items with Firestore's
`onSnapshot`. Whenever anyone changes something, Firestore sends the new version and every screen re-draws.
`changesBetween()` in `lib/items.ts` compares the list before and after, to write messages like "Lerato added
Bread", and stays quiet about your own changes.

**Offline.** Firestore keeps a copy of the household's lists on the phone (`persistentLocalCache`), so ticks
and new items show straight away and are sent when the connection is back. `public/sw.js` keeps a copy of the
app itself: pages come from the network first and the saved copy when offline, and Next.js's built files
(which never change) come from the saved copy first.

**Invites.** Each household has a random 12-character invite code (`lib/invite.ts`, using
`crypto.getRandomValues` and leaving out letters that look alike). The code is the invitation: invite codes can
be looked up one at a time but never listed, so nobody can find a household without being sent its link.

**Security rules** (`firestore.rules`). The app runs on people's phones, so anyone could change its code. The
rules run on Google's servers and decide what each signed-in person can do, whatever the app sends:
- your profile: only you
- a household and its lists: only its members
- joining: you can add only yourself, and only with a real invite code for that household
- leaving: you can remove only yourself, and only the last member can delete the household
- spending: members can only change the "spent per month" totals, not anything else about the household that way
- names and items are checked for the right fields and sensible lengths, prices must be whole cents, and a repeat
  can only be one of the choices in the app

**Repeating chores** (`lib/repeat.ts`). A repeating chore has `repeatDays` and, once it's done, `dueAt`: the start
of the day it's due again, worked out by date rather than by adding 24 hours, so a clock change can't move it.
Every phone decides "is it due yet?" from its own clock (`isOpen()`), so nothing has to run on a server. Ticking it
again sets a new `dueAt`, and with taking turns, `nextInTurn()` hands it to the next person.

**Prices and spending** (`lib/money.ts`). Prices are kept in cents, so totals never come out as R 0,30000000004.
Ticking a priced item adds it to the household's `spent` total for that month (in South African time) with
Firestore's `increment()`, which adds safely even if two people tick things at the same moment; unticking takes it
off again. Items saved before prices and repeats existed are read with sensible defaults (`readItem()`).

**Shop aisles.** `categorize()` in `lib/categories.ts` looks for known words, singular or plural, with longer
phrases first (so "peanut butter" is Pantry, not Dairy). Anything unknown goes under Other.

## Tests
`npm test` runs the unit tests in `tests/` with Vitest: reading amounts ("500g mince") and prices ("2 milk R32,99"),
sorting into aisles, grouping and ordering the lists, the live messages, "5 min ago", the shopping totals and
spent per month (including the month in South African time), repeating chores coming back on the right day and
taking turns, items saved before prices existed, invite codes and links, and names and initials. A GitHub Action runs
them on every push (`.github/workflows/tests.yml`).

## Setup (run it yourself)
1. **Firebase:** create a project at [console.firebase.google.com](https://console.firebase.google.com).
   - Authentication → Get started → turn on **Email/Password** and **Google**.
   - Firestore Database → Create database (production mode).
   - Firestore Database → **Rules**: paste in `firestore.rules` and press **Publish**.
   - Project settings → General → Your apps → add a **Web app** to get its settings.
2. **Settings:** copy `.env.example` to `.env.local` and fill in the four values from step 1.
3. **Run it:** `npm install`, then `npm run dev`, and open http://localhost:3000.
4. **Deploy on Vercel:** import the GitHub repo, add the same four settings under
   Settings → Environment Variables, and deploy. Then, in Firebase, add the Vercel address under
   Authentication → Settings → **Authorized domains**, so Google sign-in works there.

## Environment variables
Names only; the values are in `.env.local` (never committed) and in Vercel.

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | The web app's API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | The Firebase project's ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | The web app's ID |

These are public by design: they say which Firebase project to use, they don't unlock anything. What protects
the lists is `firestore.rules`.

## Known gaps
- **The security rules aren't in the automatic tests.** They'd need the Firebase emulator; they're tested by hand.
- **No push notifications.** You see "Lerato ticked Milk" only while the app is open.
- **Invite links don't expire** on their own. A member can press "New link" to retire the old one.
- **Repeating chores use each phone's clock**, so "back tomorrow" switches at midnight where you are.
- **Spending only counts what's ticked off with a price**, and one price per line (not per item), so "2 milk R32,99"
  means R32,99 for both.
- **No owner role yet.** Everyone in a household can do the same things; nobody can remove someone else.
- **English only**, and the aisle words are a fixed list rather than learning from what you buy.

## Use of AI
I built TickList with Claude (by Anthropic) as my AI pair programmer:

1. **I decided what to build**: the idea, who it's for, the features and how it should look and behave.
2. **Claude wrote the code** for it and explained how it works.
3. **I set up Firebase and Vercel, added each change to my project**, ran it, tested it on my laptop and
   phone, committed it and deployed it, and reported anything that broke or looked wrong so we could fix it.
