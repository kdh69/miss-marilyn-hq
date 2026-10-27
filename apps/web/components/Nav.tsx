"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const TABS = [
  { href: "/", label: "Today" },
  { href: "/progress", label: "Progress" },
  { href: "/books", label: "Books" },
  { href: "/messages", label: "Messages" },
  { href: "/next", label: "What's next" },
  { href: "/money", label: "Money" },
  { href: "/trends", label: "Trends" },
  { href: "/accounts", label: "Accounts" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${active ? "bg-orange-500/15 font-semibold text-orange-600" : "text-[var(--ink)] hover:bg-white/60"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
