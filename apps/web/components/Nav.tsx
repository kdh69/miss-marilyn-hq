"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: keyof typeof ICON };

/** Five tabs each, in the order each person needs them. */
export const TABS: Record<"mom" | "kyle", Tab[]> = {
  mom: [
    { href: "/books", label: "Books", icon: "book" },
    { href: "/progress", label: "Progress", icon: "track" },
    { href: "/ideas", label: "Ideas", icon: "bulb" },
    { href: "/todo", label: "To-do", icon: "check" },
    { href: "/money", label: "Money", icon: "coin" },
  ],
  kyle: [
    { href: "/books", label: "Books", icon: "book" },
    { href: "/progress", label: "Progress", icon: "track" },
    { href: "/inbox", label: "Inbox", icon: "inbox" },
    { href: "/system", label: "System", icon: "gear" },
    { href: "/money", label: "Money", icon: "coin" },
  ],
};

const ICON = {
  book: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5V4.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  track: "M3 17h4l3-8 4 12 3-6h4",
  bulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
  check: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  coin: "M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5 4h14l3 8v8H2v-8l3-8z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};

function Icon({ name, className = "" }: { name: keyof typeof ICON; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICON[name]} />
    </svg>
  );
}

const useActive = () => { const path = usePathname(); return (href: string) => path === href || path.startsWith(href + "/"); };

/** Desktop sidebar links. */
export function SideNav({ view }: { view: "mom" | "kyle" }) {
  const isActive = useActive();
  const tabs = TABS[view];
  return (
      <nav className="flex flex-col gap-1" aria-label="Sections">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${isActive(t.href) ? "bg-orange-500/15 font-semibold text-orange-700" : "text-[var(--ink)] hover:bg-white/60"}`}>
            <Icon name={t.icon} className="h-5 w-5" />
            {t.label}
          </Link>
        ))}
      </nav>
  );
}

/** Phone bottom tab bar. Rendered outside the sidebar so it's never hidden with it. */
export function TabBar({ view }: { view: "mom" | "kyle" }) {
  const isActive = useActive();
  const tabs = TABS[view];
  return (
      <nav className="tabbar glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t md:hidden" aria-label="Sections">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 px-1 pt-2 text-[11px] ${isActive(t.href) ? "font-semibold text-orange-600" : "text-[var(--quiet)]"}`}>
            <Icon name={t.icon} className="h-6 w-6" />
            {t.label}
          </Link>
        ))}
      </nav>
  );
}
