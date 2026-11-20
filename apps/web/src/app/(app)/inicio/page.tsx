import { canManageOrganizationSettings } from "@licitaciones/core/accounts";
import { formatDateLima } from "@licitaciones/core/shared";
import { buttonVariants, Card, CardTitle, EmptyState } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { SubscriptionBadge } from "@/features/accounts/components/subscription-badge";
import { getPlanName, getSeatUsage } from "@/features/accounts/data";
import { OpportunityList } from "@/features/alerts/components/opportunity-list";
import { BidsOverview } from "@/features/bids/components/bids-overview";
import { listBids } from "@/features/bids/data";
import { listAlertProfiles, listRecentMatches } from "@/features/alerts/data";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const { organization, subscription } = await requireMembership();
  const [actor, planName, seats, profiles, matches, bids] = await Promise.all([
    getActor(organization.id),
    getPlanName(subscription.planCode),
    getSeatUsage(organization.id),
    listAlertProfiles(organization.id),
    listRecentMatches(organization.id),
    listBids(organization.id),
  ]);
  const canManage = canManageOrganizationSettings(actor);
  const firstProfile = profiles[0];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-muted text-sm">{organization.name}</p>
        <h1 className="font-display mt-1 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Inicio
        </h1>
      </header>

      <BidsOverview bids={bids} now={new Date()} />

      {!firstProfile ? (
        <EmptyState
          title="Configura tus alertas para empezar"
          description={
            canManage
              ? "Cuéntanos qué vende tu empresa, dónde atiende y en qué montos. En unos minutos verás lo que te habría llegado el último mes."
              : "Pide a quien administra la cuenta de tu empresa que configure las alertas."
          }
          action={
            canManage ? (
              <Link href="/alertas/nuevo" className={buttonVariants()}>
                Configurar mis alertas
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section aria-labelledby="oportunidades" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="oportunidades" className="text-lg font-semibold">
                Tus oportunidades
              </h2>
              <p className="text-muted text-sm">
                Licitaciones de SEACE que encajan con tus perfiles, las más recientes primero.
              </p>
            </div>
            <Link href="/alertas" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ajustar alertas
            </Link>
          </div>
          {matches.length > 0 ? (
            <OpportunityList opportunities={matches} />
          ) : (
            <EmptyState
              title="Todavía no hay coincidencias nuevas"
              description="Cada mañana, después de la actualización de SEACE, aquí aparecerán las licitaciones nuevas que encajen con tus perfiles."
              action={
                canManage ? (
                  <Link
                    href={`/alertas/${firstProfile.id}`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Ver qué te habría llegado el último mes
                  </Link>
                ) : undefined
              }
            />
          )}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Tu plan</CardTitle>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Plan</dt>
              <dd className="font-medium">{planName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Estado</dt>
              <dd>
                <SubscriptionBadge subscription={subscription} now={new Date()} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Vigente hasta</dt>
              <dd className="tabular-nums">{formatDateLima(subscription.endsAt)}</dd>
            </div>
          </dl>
        </Card>
        <Card className="flex flex-col">
          <CardTitle>Tu equipo</CardTitle>
          <p className="mt-4 text-3xl font-medium tabular-nums">
            {seats?.used ?? 0}
            <span className="text-muted text-base">
              {" "}
              / {seats?.maxSeats ?? subscription.maxSeats}
            </span>
          </p>
          <p className="text-muted mt-1 text-sm">usuarios del plan en uso</p>
          <Link
            href="/empresa"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "mt-4 self-start",
            })}
          >
            Ver equipo
          </Link>
        </Card>
      </div>
    </div>
  );
}
