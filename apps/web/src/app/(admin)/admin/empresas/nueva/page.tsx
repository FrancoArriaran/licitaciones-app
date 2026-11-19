import { Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { listPlans } from "@/features/accounts/data";
import { CreateOrganizationForm } from "@/features/admin/components/create-organization-form";

export const metadata: Metadata = { title: "Nueva empresa" };

export default async function NewOrganizationPage() {
  const plans = await listPlans();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/empresas" className="text-primary text-sm hover:underline">
          ← Empresas
        </Link>
        <h1 className="font-display mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Nueva empresa
        </h1>
        <p className="text-muted text-sm">
          Se crea con su plan y vigencia, y el responsable recibe una invitación por correo.
        </p>
      </div>
      <Card className="p-6">
        <CreateOrganizationForm
          plans={plans}
          defaultEndsAt={oneYearFromNow.toISOString().slice(0, 10)}
        />
      </Card>
    </div>
  );
}
