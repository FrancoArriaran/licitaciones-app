import type { BidStatus, LostReason } from "@licitaciones/core/bids";
import { formatDateTimeLima, formatMoney } from "@licitaciones/core/shared";
import type { ReactNode } from "react";
import type { BidEvent } from "../data";
import { BID_STATUS, LOST_REASON } from "../labels";

const money = (value: unknown) => (typeof value === "number" ? formatMoney(value, "PEN") : null);
const fileName = (value: unknown) => (typeof value === "string" ? value : "un documento");
const statusLabel = (value: unknown) =>
  typeof value === "string" && value in BID_STATUS ? BID_STATUS[value as BidStatus].label : "—";

/** One readable sentence per event; notes keep their text below. */
function describe(event: BidEvent, team: Map<string, string>): ReactNode {
  const { data } = event;
  switch (event.type) {
    case "created":
      return data.source === "seace_import"
        ? "Importó esta postulación desde su historial en SEACE"
        : "Empezó a seguir esta licitación";
    case "status_changed":
      return (
        <>
          Cambió el estado de <strong>{statusLabel(data.from)}</strong> a{" "}
          <strong>{statusLabel(data.to)}</strong>
        </>
      );
    case "offer_changed": {
      const to = money(data.to);
      const from = money(data.from);
      if (!to) return "Quitó el precio ofertado";
      return from ? (
        <>
          Cambió el precio ofertado de {from} a <strong>{to}</strong>
        </>
      ) : (
        <>
          Registró el precio ofertado: <strong>{to}</strong>
        </>
      );
    }
    case "result_recorded": {
      if (data.to === "won") {
        const amount = money(data.awardedAmount);
        return (
          <>
            Registró que <strong>la ganó</strong>
            {amount ? ` por ${amount}` : ""}
          </>
        );
      }
      const reason =
        typeof data.lostReason === "string" ? LOST_REASON[data.lostReason as LostReason] : null;
      return (
        <>
          Registró que <strong>no la ganó</strong>
          {reason ? ` (${reason.toLocaleLowerCase("es-PE")})` : ""}
        </>
      );
    }
    case "note":
      return "Agregó una nota";
    case "document_added":
      return <>Subió «{fileName(data.name)}»</>;
    case "document_removed":
      return <>Eliminó «{fileName(data.name)}»</>;
    case "assigned":
      return typeof data.to === "string" && team.has(data.to) ? (
        <>
          Asignó la postulación a <strong>{team.get(data.to)}</strong>
        </>
      ) : (
        "Quitó al responsable"
      );
    case "result_detected":
      return "SEACE publicó el resultado";
  }
}

export function BidTimeline({
  events,
  team,
}: {
  events: BidEvent[];
  team: { userId: string; email: string }[];
}) {
  const emails = new Map(team.map((member) => [member.userId, member.email]));
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < events.length - 1 && (
            <span aria-hidden className="bg-border absolute top-3 left-[5px] h-full w-px" />
          )}
          <span
            aria-hidden
            className={
              event.type === "note"
                ? "bg-info mt-1.5 size-[11px] shrink-0 rounded-full"
                : event.type === "result_recorded"
                  ? "bg-primary mt-1.5 size-[11px] shrink-0 rounded-full"
                  : "border-border bg-surface mt-1.5 size-[11px] shrink-0 rounded-full border-2"
            }
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{describe(event, emails)}</p>
            {event.type === "note" && typeof event.data.text === "string" && (
              <p className="bg-surface-muted mt-1.5 rounded-lg px-3 py-2 text-sm whitespace-pre-line">
                {event.data.text}
              </p>
            )}
            <p className="text-muted mt-0.5 text-xs">
              {event.actorEmail ?? "Alguien del equipo"} ·{" "}
              <time dateTime={event.createdAt}>
                {formatDateTimeLima(new Date(event.createdAt))}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
