import { formatDateLima } from "@licitaciones/core/shared";
import { buttonVariants, EmptyState, Table, Td, Th } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { SubscriptionBadge } from "@/features/accounts/components/subscription-badge";
import { listPlans } from "@/features/accounts/data";
import { listOrganizations } from "@/features/admin/data";

export const metadata: Metadata = { title: "Empresas" };

export default async function OrganizationsPage() {
  const [organizations, plans] = await Promise.all([listOrganizations(), listPlans()]);
  const planName = (code: string) => plans.find((plan) => plan.code === code)?.name ?? code;
  const now = new Date();
  const newButton = (
    <Link href="/admin/empresas/nueva" className={buttonVariants({ size: "sm" })}>
      Nueva empresa
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
            Empresas
          </h1>
          <p className="text-muted text-sm">{organizations.length} en total</p>
        </div>
        {organizations.length > 0 && newButton}
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          title="Todavía no hay empresas"
          description="Crea la primera cuando cierres un trato o quieras abrir una prueba. Al crearla obtendrás un enlace de acceso para su responsable, para copiar o enviar por WhatsApp."
          action={newButton}
        />
      ) : (
        <Table caption="Empresas clientes">
          <thead>
            <tr>
              <Th>Empresa</Th>
              <Th>Plan</Th>
              <Th>Estado</Th>
              <Th className="text-right">Usuarios</Th>
              <Th>Alta</Th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((organization) => (
              <tr key={organization.id} className="hover:bg-surface-muted/60">
                <Td>
                  <Link
                    href={`/admin/empresas/${organization.id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {organization.name}
                  </Link>
                  <p className="text-muted text-xs tabular-nums">{organization.ruc}</p>
                </Td>
                <Td>
                  {organization.subscription ? planName(organization.subscription.planCode) : "—"}
                </Td>
                <Td>
                  {organization.subscription && (
                    <SubscriptionBadge subscription={organization.subscription} now={now} />
                  )}
                </Td>
                <Td className="text-right tabular-nums">
                  {organization.memberCount}
                  {organization.subscription && ` / ${organization.subscription.maxSeats}`}
                </Td>
                <Td className="text-muted whitespace-nowrap">
                  {formatDateLima(organization.createdAt)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
