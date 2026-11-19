import { canInviteWithRole, canManageMember } from "@licitaciones/core/accounts";
import { formatDateLima } from "@licitaciones/core/shared";
import { Card, CardDescription, CardTitle } from "@licitaciones/ui";
import type { Metadata } from "next";
import {
  inviteTeamMember,
  removeTeamMember,
  renewTeamInvitation,
} from "@/features/accounts/actions";
import { InviteForm } from "@/features/accounts/components/invite-form";
import { SubscriptionBadge } from "@/features/accounts/components/subscription-badge";
import { TeamList } from "@/features/accounts/components/team-list";
import { getPlanName, getSeatUsage, listTeamMembers } from "@/features/accounts/data";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Mi empresa" };

export default async function OrganizationPage() {
  const { organization, subscription } = await requireMembership();
  const [actor, members, seats, planName] = await Promise.all([
    getActor(organization.id),
    listTeamMembers(organization.id),
    getSeatUsage(organization.id),
    getPlanName(subscription.planCode),
  ]);
  const canInvite = canInviteWithRole(actor, "member");
  const seatsLeft = seats ? seats.maxSeats - seats.used : 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Mi empresa
        </h1>
      </header>

      <Card>
        <CardTitle>{organization.name}</CardTitle>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">RUC</dt>
            <dd className="mt-1 tabular-nums">{organization.ruc}</dd>
          </div>
          <div>
            <dt className="text-muted">Plan</dt>
            <dd className="mt-1 font-medium">{planName}</dd>
          </div>
          <div>
            <dt className="text-muted">Vigencia</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <SubscriptionBadge subscription={subscription} now={new Date()} />
              <span className="text-muted text-xs">
                desde {formatDateLima(subscription.startsAt)}
              </span>
            </dd>
          </div>
        </dl>
      </Card>

      <section className="flex flex-col gap-4" aria-labelledby="equipo">
        <div>
          <h2 id="equipo" className="text-lg font-semibold">
            Equipo
          </h2>
          <p className="text-muted text-sm">
            {seats ? `${seats.used} de ${seats.maxSeats} usuarios del plan en uso.` : null}
          </p>
        </div>
        <TeamList
          members={members}
          canManage={(member) =>
            member.userId !== actor.userId && canManageMember(actor, member.role)
          }
          renewAction={renewTeamInvitation}
          removeAction={removeTeamMember}
        />
      </section>

      {canInvite && (
        <Card>
          <CardTitle>Invitar a alguien de tu equipo</CardTitle>
          <CardDescription>
            {seatsLeft > 0
              ? "Te daremos un enlace para que cree su contraseña. Envíaselo por WhatsApp o correo."
              : "Ya usas todos los usuarios de tu plan. Escríbenos si necesitas más."}
          </CardDescription>
          {seatsLeft > 0 && (
            <div className="mt-5">
              <InviteForm
                action={inviteTeamMember}
                roles={["member", "admin"]}
                defaultRole="member"
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
