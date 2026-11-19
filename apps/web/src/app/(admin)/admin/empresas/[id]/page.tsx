import {
  EmailAlreadyRegisteredError,
  ORGANIZATION_ROLES,
  SeatLimitReachedError,
} from "@licitaciones/core/accounts";
import { formatDateLima } from "@licitaciones/core/shared";
import { Alert, Card, CardDescription, CardTitle } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  inviteMemberAsStaff,
  removeMemberAsStaff,
  renewInvitationAsStaff,
} from "@/features/accounts/actions";
import { InviteForm } from "@/features/accounts/components/invite-form";
import { SubscriptionBadge } from "@/features/accounts/components/subscription-badge";
import { TeamList } from "@/features/accounts/components/team-list";
import { getPlanName, listPlans, listTeamMembers } from "@/features/accounts/data";
import { updateSubscriptionAsStaff } from "@/features/admin/actions";
import { SubscriptionForm } from "@/features/admin/components/subscription-form";
import { getOrganization } from "@/features/admin/data";

export const metadata: Metadata = { title: "Empresa" };

const INVITATION_FAILURES: Record<string, string> = {
  [new EmailAlreadyRegisteredError().code]: new EmailAlreadyRegisteredError().message,
  [new SeatLimitReachedError(1).code]: "El plan no tiene usuarios disponibles.",
};

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invitacion?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const organization = await getOrganization(id);
  if (!organization) notFound();

  const [members, planName, plans] = await Promise.all([
    listTeamMembers(organization.id),
    organization.subscription ? getPlanName(organization.subscription.planCode) : null,
    listPlans(),
  ]);
  const activeOwners = members.filter((member) => member.role === "owner" && member.joinedAt);
  const owner = members.find((member) => member.role === "owner");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/empresas" className="text-primary text-sm hover:underline">
          ← Empresas
        </Link>
        <h1 className="font-display mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          {organization.name}
        </h1>
        <p className="text-muted text-sm tabular-nums">RUC {organization.ruc}</p>
      </div>

      {query.invitacion && (
        <Alert tone="warning" title="La empresa se creó, pero no se pudo crear la invitación">
          {INVITATION_FAILURES[query.invitacion] ??
            "Ocurrió un error inesperado al invitar. Revisa los registros del servidor."}{" "}
          Invita al responsable desde el formulario de abajo.
        </Alert>
      )}

      <Card>
        <CardTitle>Plan</CardTitle>
        {organization.subscription ? (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Plan</dt>
              <dd className="mt-1 font-medium">{planName}</dd>
            </div>
            <div>
              <dt className="text-muted">Estado</dt>
              <dd className="mt-1">
                <SubscriptionBadge subscription={organization.subscription} now={new Date()} />
              </dd>
            </div>
            <div>
              <dt className="text-muted">Vigencia</dt>
              <dd className="mt-1 tabular-nums">
                {formatDateLima(organization.subscription.startsAt)} –{" "}
                {formatDateLima(organization.subscription.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Usuarios</dt>
              <dd className="mt-1 tabular-nums">
                {members.length} / {organization.subscription.maxSeats}
              </dd>
            </div>
          </dl>
        ) : (
          <CardDescription>Sin suscripción registrada.</CardDescription>
        )}
        {organization.subscription && (
          <div className="border-border mt-6 border-t pt-6">
            <SubscriptionForm
              action={updateSubscriptionAsStaff.bind(null, organization.id)}
              subscription={organization.subscription}
              plans={plans}
            />
          </div>
        )}
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="equipo">
        <h2 id="equipo" className="text-lg font-semibold">
          Equipo
        </h2>
        {members.length > 0 ? (
          <TeamList
            members={members}
            canManage={(member) =>
              member.role !== "owner" || !member.joinedAt || activeOwners.length > 1
            }
            renewAction={renewInvitationAsStaff.bind(null, organization.id)}
            removeAction={removeMemberAsStaff.bind(null, organization.id)}
          />
        ) : (
          <p className="text-muted text-sm">Nadie ha sido invitado todavía.</p>
        )}
      </section>

      <Card>
        <CardTitle>Invitar usuario</CardTitle>
        <CardDescription>
          Te daremos un enlace para que cree su contraseña. Envíaselo por WhatsApp o correo.
        </CardDescription>
        <div className="mt-5">
          <InviteForm
            action={inviteMemberAsStaff.bind(null, organization.id)}
            roles={ORGANIZATION_ROLES}
            defaultRole={owner ? "member" : "owner"}
          />
        </div>
      </Card>
    </div>
  );
}
