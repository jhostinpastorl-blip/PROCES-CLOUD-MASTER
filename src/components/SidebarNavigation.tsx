"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = { href: string; label: string };

const icons: Record<string, string> = {
  "/app/dashboard": "⌂",
  "/app/context": "◇",
  "/app/branches": "⌘",
  "/app/users": "◎",
  "/app/roles": "◈",
  "/app/modules": "▦",
  "/app/storage": "▤",
  "/app/audit": "↗",
  "/app/notifications": "◌",
  "/app/settings": "⚙",
  "/app/pos": "▣",
  "/app/rest": "◫",
  "/app/conta": "▥",
  "/app/flow": "⇄",
  "/app/docs": "▤",
  "/app/viernes": "✦",
};

export function SidebarNavigation({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();

  return (
    <nav>
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/app/dashboard" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            className={`sidebar-link ${active ? "is-active" : ""}`}
            href={item.href}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            <i aria-hidden="true">{icons[item.href] ?? "◇"}</i>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
