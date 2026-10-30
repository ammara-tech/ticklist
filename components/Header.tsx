"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import SyncBadge from "@/components/SyncBadge";
import ThemeToggle from "@/components/ThemeToggle";
import { useApp } from "@/lib/store";

/* The bar at the top: logo, which household you're in, whether it's live, the theme and you */
export default function Header() {
  const { household, profile, uid } = useApp();
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight" aria-label="TickList: back to the lists">
          <Logo />
          <span className="hidden min-[400px]:inline">TickList</span>
        </Link>
        {household && (
          <Link
            href="/household"
            aria-current={path === "/household" ? "page" : undefined}
            className="min-w-0 truncate rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold hover:border-basil"
            title="Household: members, invite link and settings"
          >
            {household.name}
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1">
          <SyncBadge />
          <ThemeToggle />
          {uid && (
            <Link href="/household" className="tool" aria-label="You and your household">
              <Avatar uid={uid} name={profile.name || "Me"} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
