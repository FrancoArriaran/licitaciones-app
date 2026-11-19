"use client";

import { cn } from "@licitaciones/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({
  items,
  orientation,
}: {
  items: readonly { href: string; label: string }[];
  orientation: "vertical" | "horizontal";
}) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "flex-row")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-primary-soft text-primary font-medium"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
