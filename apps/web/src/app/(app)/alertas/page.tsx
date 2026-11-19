import { canManageOrganizationSettings } from "@licitaciones/core/accounts";
import { departmentLabel } from "@licitaciones/core/alerts";
import { formatPen } from "@licitaciones/core/shared";
import {
  Alert,
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
} from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { NotificationSettingsForm } from "@/features/alerts/components/notification-settings-form";
import {
  getNotificationSettings,
  getProfileQuota,
  listAlertProfiles,
  listCatalog,
  type AlertProfileView,
} from "@/features/alerts/data";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Alertas" };

function amountRange(profile: AlertProfileView): string {
  const { minAmount: min, maxAmount: max } = profile;
  if (min === null && max === null) return "Cualquier monto";
  if (min !== null && max !== null) return `De ${formatPen(min)} a ${formatPen(max)}`;
  return min !== null ? `Desde ${formatPen(min)}` : `Hasta ${formatPen(max ?? 0)}`;
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [{ organization }, { guardado }] = await Promise.all([requireMembership(), searchParams]);
  const [actor, profiles, quota, catalog, settings] = await Promise.all([
    getActor(organization.id),
    listAlertProfiles(organization.id),
    getProfileQuota(organization.id),
    listCatalog(),
    getNotificationSettings(organization.id),
  ]);
  const canManage = canManageOrganizationSettings(actor);
  const canCreate = canManage && (quota.maxProfiles === null || quota.used < quota.maxProfiles);
  const familyName = new Map(catalog.map((family) => [family.code, family.description]));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
            Alertas
          </h1>
          <p className="text-muted mt-1 text-sm">
            Qué licitaciones te avisamos y por dónde.
            {quota.maxProfiles !== null &&
              ` Tu plan incluye ${quota.maxProfiles} ${quota.maxProfiles === 1 ? "perfil" : "perfiles"}.`}
          </p>
        </div>
        {canCreate && profiles.length > 0 && (
          <Link href="/alertas/nuevo" className={buttonVariants({ size: "sm" })}>
            Nuevo perfil
          </Link>
        )}
      </header>

      {guardado && (
        <Alert tone="success">
          Guardamos tu perfil. Las coincidencias se calculan cada mañana con lo nuevo de SEACE.
        </Alert>
      )}

      <section aria-labelledby="perfiles" className="flex flex-col gap-4">
        <h2 id="perfiles" className="sr-only">
          Perfiles de alerta
        </h2>
        {profiles.length === 0 ? (
          <EmptyState
            title="Todavía no configuraste tus alertas"
            description={
              canManage
                ? "Cuéntanos qué vende tu empresa y dónde atiende. Te mostraremos lo que te habría llegado el último mes antes de guardar."
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
          profiles.map((profile) => (
            <Card key={profile.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{profile.name}</CardTitle>
                    {profile.status === "paused" ? (
                      <Badge tone="warning">Pausado</Badge>
                    ) : (
                      <Badge tone="success">Activo</Badge>
                    )}
                  </div>
                  <CardDescription className="max-w-2xl">
                    {profile.businessDescription}
                  </CardDescription>
                </div>
                {canManage && (
                  <Link
                    href={`/alertas/${profile.id}`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Editar
                  </Link>
                )}
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <dt className="text-muted">Categorías</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.families.map((code) => (
                      <Badge key={code}>{familyName.get(code) ?? code}</Badge>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Regiones</dt>
                  <dd className="mt-1">
                    {profile.departments.length === 0
                      ? "Todo el Perú"
                      : profile.departments.map(departmentLabel).join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Montos</dt>
                  <dd className="mt-1 tabular-nums">{amountRange(profile)}</dd>
                </div>
              </dl>
            </Card>
          ))
        )}
      </section>

      <Card>
        <CardTitle>Cómo te avisamos</CardTitle>
        <CardDescription>
          Un resumen al día con todo lo nuevo. Nunca te repetimos una licitación.
        </CardDescription>
        <div className="mt-5">
          {canManage ? (
            <NotificationSettingsForm settings={settings} />
          ) : (
            <p className="text-sm">
              {[settings.emailEnabled && "Correo", settings.whatsappEnabled && "WhatsApp"]
                .filter(Boolean)
                .join(" y ") || "Sin canales activos"}
              , cada día a las {settings.digestHour}:00.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
