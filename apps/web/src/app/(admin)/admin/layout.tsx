import { Badge } from "@licitaciones/ui";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { requirePlatformAdmin } from "@/lib/session";

const NAV = [
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/leads", label: "Leads" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin();

  return (
    <div className="min-h-dvh">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin/empresas" />
            <Badge tone="warning">Backoffice</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted hidden text-xs sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
        <nav
          aria-label="Backoffice"
          className="mx-auto max-w-6xl overflow-x-auto px-3 pb-2 sm:px-5"
        >
          <NavLinks items={NAV} orientation="horizontal" />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
