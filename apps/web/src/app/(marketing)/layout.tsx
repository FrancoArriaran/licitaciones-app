import { buttonVariants } from "@licitaciones/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { SectionLink } from "@/components/section-link";
import { containerClass } from "@/features/marketing/components/section";

const NAV: { href: `/#${string}`; label: string }[] = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#alerta", label: "Qué recibes" },
  { href: "/#preguntas", label: "Preguntas" },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/70 bg-background/85 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className={`${containerClass} flex h-16 items-center justify-between gap-6`}>
          <Logo />
          <nav aria-label="Principal" className="hidden items-center gap-8 text-sm md:flex">
            {NAV.map((item) => (
              <SectionLink
                key={item.href}
                href={item.href}
                className="text-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </SectionLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {/* On phones the login link lives in the footer; the header keeps the main action. */}
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "hidden sm:inline-flex",
              })}
            >
              Ingresar
            </Link>
            <Link href="/demo" className={buttonVariants({ size: "sm" })}>
              Solicitar demo
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-border bg-surface border-t">
        <div className={`${containerClass} grid gap-10 py-12 text-sm md:grid-cols-[1.4fr_1fr_1fr]`}>
          <div className="max-w-xs">
            <Logo />
            <p className="text-muted mt-4 leading-relaxed">
              Alertas diarias de compras del Estado peruano para empresas que quieren venderle.
            </p>
          </div>
          <nav aria-label="Producto" className="flex flex-col gap-2.5">
            <p className="font-medium">Producto</p>
            {NAV.map((item) => (
              <SectionLink
                key={item.href}
                href={item.href}
                className="text-muted hover:text-foreground"
              >
                {item.label}
              </SectionLink>
            ))}
          </nav>
          <nav aria-label="Cuenta" className="flex flex-col gap-2.5">
            <p className="font-medium">Cuenta</p>
            <Link href="/demo" className="text-muted hover:text-foreground">
              Solicitar demo
            </Link>
            <Link href="/login" className="text-muted hover:text-foreground">
              Ingresar
            </Link>
          </nav>
        </div>
        <div className={`${containerClass} border-border text-muted border-t py-6 text-xs`}>
          © {new Date().getFullYear()} Licitaciones. Datos públicos del OECE (SEACE).
        </div>
      </footer>
    </div>
  );
}
