import { isOpenStatus } from "@licitaciones/core/bids";
import { Alert, buttonVariants, cn, EmptyState } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ClosedBidsTable, OpenBidsBoard } from "@/features/bids/components/bid-board";
import { listBids } from "@/features/bids/data";
import { requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Postulaciones" };

export default async function BidsPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; eliminada?: string; importadas?: string }>;
}) {
  const [{ organization }, params] = await Promise.all([requireMembership(), searchParams]);
  const bids = await listBids(organization.id);
  const open = bids.filter((bid) => isOpenStatus(bid.status));
  const closed = bids.filter((bid) => !isOpenStatus(bid.status));
  const showClosed = params.vista === "cerradas";
  const now = new Date();

  const tabs = [
    { href: "/postulaciones", label: "En curso", count: open.length, active: !showClosed },
    {
      href: "/postulaciones?vista=cerradas",
      label: "Cerradas",
      count: closed.length,
      active: showClosed,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-sm">{organization.name}</p>
          <h1 className="font-display mt-1 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
            Postulaciones
          </h1>
          <p className="text-muted mt-1 text-sm">
            Las licitaciones que sigues, de la evaluación al resultado.
          </p>
        </div>
        {bids.length > 0 && (
          <Link
            href="/postulaciones/historial"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Importar mi historial de SEACE
          </Link>
        )}
      </header>

      {params.eliminada && <Alert tone="success">Postulación eliminada.</Alert>}
      {params.importadas && (
        <Alert tone="success">
          {params.importadas === "0"
            ? "Tu historial ya estaba al día."
            : `Agregamos ${params.importadas} procesos de tu historial en SEACE.`}
        </Alert>
      )}

      {bids.length === 0 ? (
        <EmptyState
          title="Aún no sigues ninguna licitación"
          description="Cuando una oportunidad te interese, abre su ficha y pulsa «Seguir esta licitación». Aquí registrarás tu oferta, tus documentos y el resultado."
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/inicio" className={buttonVariants()}>
                Ver mis oportunidades
              </Link>
              <Link
                href="/postulaciones/historial"
                className={buttonVariants({ variant: "secondary" })}
              >
                Importar mi historial de SEACE
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <nav aria-label="Vistas de postulaciones" className="border-border flex gap-1 border-b">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                  tab.active
                    ? "border-primary text-foreground font-medium"
                    : "text-muted hover:text-foreground border-transparent",
                )}
              >
                {tab.label} <span className="text-muted tabular-nums">({tab.count})</span>
              </Link>
            ))}
          </nav>

          {showClosed ? (
            closed.length > 0 ? (
              <ClosedBidsTable bids={closed} />
            ) : (
              <p className="text-muted text-sm">
                Cuando registres un resultado (ganada, no ganada, desierta o no me presenté), la
                postulación pasará aquí.
              </p>
            )
          ) : (
            <OpenBidsBoard bids={open} now={now} />
          )}
        </>
      )}
    </div>
  );
}
