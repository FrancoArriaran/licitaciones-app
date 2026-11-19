import { canManageOrganizationSettings } from "@licitaciones/core/accounts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveAlertProfile } from "@/features/alerts/actions";
import { AlertProfileEditor } from "@/features/alerts/components/alert-profile-editor";
import { getAlertProfile, listCatalog } from "@/features/alerts/data";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Editar perfil de alertas" };

export default async function EditAlertProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ organization }, { id }] = await Promise.all([requireMembership(), params]);
  const [actor, profile, catalog] = await Promise.all([
    getActor(organization.id),
    getAlertProfile(organization.id, id),
    listCatalog(),
  ]);
  if (!profile) notFound();
  if (!canManageOrganizationSettings(actor)) redirect("/alertas");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/alertas" className="text-primary text-sm hover:underline">
          ← Alertas
        </Link>
        <h1 className="font-display mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          {profile.name}
        </h1>
      </div>
      <AlertProfileEditor
        catalog={catalog}
        profile={profile}
        action={saveAlertProfile.bind(null, profile.id)}
      />
    </div>
  );
}
