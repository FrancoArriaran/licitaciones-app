import { canManageOrganizationSettings } from "@licitaciones/core/accounts";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveAlertProfile } from "@/features/alerts/actions";
import { AlertProfileEditor } from "@/features/alerts/components/alert-profile-editor";
import { getProfileQuota, listCatalog } from "@/features/alerts/data";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Nuevo perfil de alertas" };

export default async function NewAlertProfilePage() {
  const { organization } = await requireMembership();
  const [actor, quota, catalog] = await Promise.all([
    getActor(organization.id),
    getProfileQuota(organization.id),
    listCatalog(),
  ]);
  const withinQuota = quota.maxProfiles === null || quota.used < quota.maxProfiles;
  if (!canManageOrganizationSettings(actor) || !withinQuota) redirect("/alertas");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/alertas" className="text-primary text-sm hover:underline">
          ← Alertas
        </Link>
        <h1 className="font-display mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Configura tus alertas
        </h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          Toma unos minutos. Antes de guardar puedes ver qué procesos te habrían llegado el último
          mes.
        </p>
      </div>
      <AlertProfileEditor
        catalog={catalog}
        profile={null}
        action={saveAlertProfile.bind(null, null)}
      />
    </div>
  );
}
