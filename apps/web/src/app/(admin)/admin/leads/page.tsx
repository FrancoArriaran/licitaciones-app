import { formatDateLima } from "@licitaciones/core/shared";
import { Badge, EmptyState, Table, Td, Th } from "@licitaciones/ui";
import type { Metadata } from "next";
import type { LeadStatus } from "@licitaciones/core/marketing";
import { LeadStatusSelect } from "@/features/admin/components/lead-status-select";
import { listLeads } from "@/features/admin/data";

export const metadata: Metadata = { title: "Leads" };

const SELLS_TO_GOVERNMENT: Record<string, string> = {
  yes: "Ya vende",
  no: "Aún no",
  not_sure: "Lo intentó",
};

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Leads
        </h1>
        <p className="text-muted text-sm">
          Solicitudes de demo desde la web, las más recientes primero.
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="Sin solicitudes todavía"
          description="Cuando alguien pida una demo desde la web aparecerá aquí con sus datos de contacto."
        />
      ) : (
        <Table caption="Solicitudes de demo">
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Contacto</Th>
              <Th>Empresa</Th>
              <Th>Qué vende</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <Td className="text-muted whitespace-nowrap">{formatDateLima(lead.createdAt)}</Td>
                <Td>
                  <p className="font-medium">{lead.fullName}</p>
                  {lead.jobTitle && <p className="text-muted text-xs">{lead.jobTitle}</p>}
                  <p className="text-xs break-all select-all">{lead.email}</p>
                  <p className="text-xs tabular-nums select-all">{lead.phone}</p>
                </Td>
                <Td>
                  <p>{lead.companyName}</p>
                  {lead.ruc && <p className="text-muted text-xs tabular-nums">{lead.ruc}</p>}
                  <Badge className="mt-1">{SELLS_TO_GOVERNMENT[lead.sellsToGovernment]}</Badge>
                </Td>
                <Td className="text-muted max-w-xs">{lead.sector}</Td>
                <Td>
                  <LeadStatusSelect leadId={lead.id} status={lead.status as LeadStatus} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
