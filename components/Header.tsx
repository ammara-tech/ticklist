"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import SyncBadge from "@/components/SyncBadge";
import ThemeToggle from "@/components/ThemeToggle";
import { useApp } from "@/lib/store";

/*
  The top of the fridge door: the household's name, handwritten like a note, with whether it's
  live, the theme and you. It scrolls away with the page, so the list gets the whole screen.
  On a phone, a bar at the bottom (PhoneBar) switches between the lists and the household,
  within reach of your thumb in the shop.
*/
export default function Header() {
  const { household, profile, uid } = useApp();
  if (!household) return null;
  return (
    <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-2 pt-5">
      <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`TickList: ${household.name}'s lists`}>
        <Logo className="h-11 w-11 shrink-0 -rotate-6" />
        <span className="min-w-0">
          <span className="block text-xs font-extrabold uppercase tracking-[0.2em] text-ink-soft">TickList</span>
          <span className="font-hand block truncate text-3xl leading-none sm:text-4xl">{household.name}</span>
        </span>
      </Link>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <SyncBadge />
        <ThemeToggle />
        {uid && (
          <Link href="/household" className="tool hidden sm:inline-flex" aria-label="You and your household">
            <Avatar uid={uid} name={profile.name || "Me"} />
          </Link>
        )}
      </div>
    </header>
  );
}

/* The bar at the bottom on phones: the lists and the household */
export function PhoneBar() {
  const path = usePathname();
  const items = [
    { href: "/", label: "Lists", icon: "cart" as const },
    { href: "/household", label: "Household", icon: "people" as const },
  ];
  return (
    <nav aria-label="Pages" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="flex">
        {items.map((i) => {
          const current = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href} className="flex-1">
              <Link href={i.href} aria-current={current ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-xs font-bold ${current ? "text-basil" : "text-ink-soft"}`}>
                <Icon name={i.icon} className="h-6 w-6" />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
