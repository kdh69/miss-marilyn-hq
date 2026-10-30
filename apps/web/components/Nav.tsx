"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

export const TABS = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/progress", label: "Progress", icon: "progress" },
  { href: "/books", label: "Books", icon: "books" },
  { href: "/messages", label: "Messages", icon: "messages" },
  { href: "/next", label: "What's next", icon: "next" },
  { href: "/money", label: "Money", icon: "money" },
  { href: "/trends", label: "Trends", icon: "trends" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
];

/** badges: count shown beside a tab, e.g. { "/": 4 }. hidden: tabs this viewer can't open. */
export function Nav({ badges = {}, hidden = [] }: { badges?: Record<string, number>; hidden?: string[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:px-0">
      {TABS.filter((t) => !hidden.includes(t.href)).map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        const n = badges[t.href] ?? 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${active ? "bg-orange-500/15 font-semibold text-orange-700" : "text-[var(--ink)] hover:bg-white/60"}`}
          >
            <Icon name={t.icon} className={`h-4 w-4 ${active ? "text-orange-600" : "text-[var(--quiet)]"}`} />
            {t.label}
            {n > 0 && <span className="ml-auto rounded-full bg-orange-500 px-1.5 text-[11px] font-semibold leading-5 text-white tabular-nums">{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
