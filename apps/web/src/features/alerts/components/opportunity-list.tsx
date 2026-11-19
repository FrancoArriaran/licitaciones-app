import { departmentLabel } from "@licitaciones/core/alerts";
import { formatDateLima, formatPen, formatTenderDescription } from "@licitaciones/core/shared";
import { Badge } from "@licitaciones/ui";
import type { Opportunity } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

function amountLabel(opportunity: Opportunity): string {
  if (!opportunity.amount) return "Sin valor publicado";
  if (opportunity.currency && opportunity.currency !== "PEN") {
    return `${opportunity.currency} ${opportunity.amount.toLocaleString("es-PE")}`;
  }
  return formatPen(opportunity.amount);
}

function EnquiryDeadline({ iso, now }: { iso: string | null; now: Date }) {
  if (!iso) return null;
  const deadline = new Date(iso);
  const days = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
  if (days < 0) return <span className="text-muted">Consultas cerradas</span>;
  const tone = days <= 2 ? "danger" : days <= 5 ? "warning" : "neutral";
  return (
    <Badge tone={tone}>
      Consultas hasta el {formatDateLima(deadline)}
      {days <= 5 ? ` (${days === 0 ? "hoy" : `${days} ${days === 1 ? "día" : "días"}`})` : ""}
    </Badge>
  );
}

/** Works in server and client components: no hooks, dates arrive as ISO strings. */
export function OpportunityList({ opportunities }: { opportunities: Opportunity[] }) {
  const now = new Date();
  return (
    <ul className="border-border bg-surface divide-border divide-y rounded-xl border">
      {opportunities.map((opportunity) => (
        <li key={opportunity.ocid} className="flex flex-col gap-2 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
            <p className="line-clamp-3 max-w-2xl leading-snug font-medium text-pretty">
              {opportunity.description
                ? formatTenderDescription(opportunity.description)
                : (opportunity.title ?? "Proceso sin descripción")}
            </p>
            <p className="shrink-0 font-medium tabular-nums">{amountLabel(opportunity)}</p>
          </div>
          <p className="text-muted text-sm">
            {[
              opportunity.buyerName,
              opportunity.department && departmentLabel(opportunity.department),
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {opportunity.title && (
              <span className="text-muted tabular-nums">{opportunity.title}</span>
            )}
            {opportunity.datePublished && (
              <span className="text-muted">
                Publicado el {formatDateLima(new Date(opportunity.datePublished))}
              </span>
            )}
            <EnquiryDeadline iso={opportunity.enquiryEnd} now={now} />
            {opportunity.category && <Badge>{opportunity.category}</Badge>}
            {opportunity.profileName && <Badge tone="info">{opportunity.profileName}</Badge>}
          </div>
        </li>
      ))}
    </ul>
  );
}
