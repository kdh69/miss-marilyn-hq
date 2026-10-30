"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; long?: string; icon: keyof typeof ICON };

/**
 * Each view's tabs. Clara's follow how a book gets made: Overview, Ideas, Script, Illustrations,
 * Building, Full book review. Everything else sits under More (sidebar on desktop, the avatar sheet
 * on a phone).
 */
export type View = "mom" | "kyle" | "family";
export const TABS: Record<View, Tab[]> = {
  mom: [
    { href: "/", label: "Overview", icon: "home" },
    { href: "/ideas", label: "Ideas", icon: "bulb" },
    { href: "/script", label: "Script", icon: "script" },
    { href: "/art", label: "Art", long: "Illustrations", icon: "art" },
    { href: "/build", label: "Build", long: "Building", icon: "build" },
    { href: "/review", label: "Review", long: "Full book review", icon: "review" },
  ],
  kyle: [
    { href: "/", label: "Overview", icon: "home" },
    { href: "/books", label: "Books", icon: "book" },
    { href: "/progress", label: "Progress", icon: "track" },
    { href: "/inbox", label: "Inbox", icon: "inbox" },
    { href: "/system", label: "System", icon: "gear" },
    { href: "/money", label: "Money", icon: "coin" },
  ],
  family: [
    { href: "/", label: "Overview", icon: "home" },
    { href: "/books", label: "Books", icon: "book" },
    { href: "/progress", label: "Progress", icon: "track" },
  ],
};

export const MORE: Record<View, Tab[]> = {
  mom: [
    { href: "/books", label: "All books", icon: "book" },
    { href: "/progress", label: "Progress", icon: "track" },
    { href: "/todo", label: "To-do & accounts", icon: "check" },
    { href: "/money", label: "Money", icon: "coin" },
  ],
  kyle: [
    { href: "/ideas", label: "Ideas", icon: "bulb" },
    { href: "/script", label: "Script", icon: "script" },
    { href: "/art", label: "Illustrations", icon: "art" },
    { href: "/build", label: "Building", icon: "build" },
    { href: "/review", label: "Full book review", icon: "review" },
  ],
  family: [],
};

const ICON = {
  script: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5",
  art: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01",
  build: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  review: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z",
  book: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5V4.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  track: "M3 17h4l3-8 4 12 3-6h4",
  bulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
  check: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  coin: "M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5 4h14l3 8v8H2v-8l3-8z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};

export function Icon({ name, className = "" }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICON[name]} />
    </svg>
  );
}

const useActive = () => { const path = usePathname(); return (href: string) => href === "/" ? path === "/" : path === href || path.startsWith(href + "/"); };

const Badge = ({ n, small = false }: { n?: number; small?: boolean }) =>
  n ? <span className={`rounded-full bg-orange-500 font-semibold text-white tabular-nums ${small ? "absolute left-1/2 top-1 ml-2 px-1.5 text-[10px] leading-4" : "ml-auto px-1.5 text-[11px] leading-5"}`}>{n}</span> : null;

/** Desktop sidebar: the tabs, then More. badges: count beside a tab, e.g. { "/script": 1 }. */
export function SideNav({ view, badges = {} }: { view: View; badges?: Record<string, number> }) {
  const isActive = useActive();
  const link = (t: Tab, quiet = false) => (
    <Link key={t.href} href={t.href}
      className={`flex items-center gap-3 rounded-xl px-3 ${quiet ? "py-2 text-sm" : "py-2.5 text-[15px]"} transition ${isActive(t.href) ? "bg-orange-500/15 font-semibold text-orange-700" : quiet ? "text-[var(--quiet)] hover:bg-white/60" : "text-[var(--ink)] hover:bg-white/60"}`}>
      <Icon name={t.icon} className={quiet ? "h-4 w-4" : "h-5 w-5"} />
      {t.long ?? t.label}
      <Badge n={badges[t.href]} />
    </Link>
  );
  return (
    <nav className="flex flex-col gap-1" aria-label="Sections">
      {TABS[view].map((t) => link(t))}
      {MORE[view].length > 0 && <p className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--quiet)]">More</p>}
      {MORE[view].map((t) => link(t, true))}
    </nav>
  );
}

/** Phone bottom tab bar. More lives behind the avatar. */
export function TabBar({ view, badges = {} }: { view: View; badges?: Record<string, number> }) {
  const isActive = useActive();
  return (
    <nav className="tabbar glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t md:hidden" aria-label="Sections">
      {TABS[view].map((t) => (
        <Link key={t.href} href={t.href}
          className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 pt-2 text-[10.5px] leading-tight ${isActive(t.href) ? "font-semibold text-orange-600" : "text-[var(--quiet)]"}`}>
          <Icon name={t.icon} className="h-6 w-6" />
          {t.label}
          <Badge n={badges[t.href]} small />
        </Link>
      ))}
    </nav>
  );
}
