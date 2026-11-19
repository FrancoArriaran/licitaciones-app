import { hasProductAccess } from "@licitaciones/core/accounts";
import { Alert } from "@licitaciones/ui";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { requireMembership, requireUser } from "@/lib/session";

const NAV = [
  { href: "/inicio", label: "Inicio" },
  { href: "/alertas", label: "Alertas" },
  { href: "/empresa", label: "Mi empresa" },
] as const;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, membership] = await Promise.all([requireUser(), requireMembership()]);
  const hasAccess = hasProductAccess(membership.subscription, new Date());

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-border bg-surface border-b md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-5">
          <Logo href="/inicio" />
          <div className="md:hidden">
            <SignOutButton />
          </div>
        </div>
        <nav aria-label="Secciones" className="overflow-x-auto px-3 pb-3 md:flex-1 md:pb-0">
          <div className="md:hidden">
            <NavLinks items={NAV} orientation="horizontal" />
          </div>
          <div className="hidden md:block">
            <NavLinks items={NAV} orientation="vertical" />
          </div>
        </nav>
        <div className="border-border hidden border-t px-5 py-4 md:block">
          <p className="truncate text-sm font-medium">{membership.organization.name}</p>
          <p className="text-muted truncate text-xs">{user.email}</p>
          <div className="mt-2 -ml-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {!hasAccess && (
          <div className="px-4 pt-6 sm:px-8">
            <Alert tone="warning" title="Tu plan no está vigente">
              Puedes revisar tu información, pero no recibirás alertas nuevas. Escríbenos para
              renovarlo.
            </Alert>
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
