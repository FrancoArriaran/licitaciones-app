import { OPEN_BID_STATUSES } from "@licitaciones/core/bids";
import { departmentLabel } from "@licitaciones/core/alerts";
import { formatDateLima, formatMoney, formatTenderDescription } from "@licitaciones/core/shared";
import { Badge, Table, Td, Th } from "@licitaciones/ui";
import Link from "next/link";
import type { BidSummary } from "../data";
import { BID_STATUS, LOST_REASON } from "../labels";
import { Deadline, nextDeadline } from "./deadline";
import { QuickMove } from "./quick-move";

function tenderTitle(bid: BidSummary): string {
  return bid.tender.description
    ? formatTenderDescription(bid.tender.description)
    : (bid.tender.title ?? "Proceso sin descripción");
}

function Initials({ email }: { email: string }) {
  return (
    <span
      title={`Responsable: ${email}`}
      className="bg-primary-soft text-primary inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold uppercase"
    >
      <span aria-hidden>{email.slice(0, 2)}</span>
      <span className="sr-only">Responsable: {email}</span>
    </span>
  );
}

function BidCard({ bid, now }: { bid: BidSummary; now: Date }) {
  const deadline = nextDeadline(bid.tender, now);
  const place = bid.tender.department ? departmentLabel(bid.tender.department) : null;
  return (
    <li className="border-border bg-surface hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 shadow-xs transition-colors">
      <div className="flex flex-col gap-1">
        <Link
          href={`/postulaciones/${bid.id}`}
          className="line-clamp-3 text-sm leading-snug font-medium text-pretty hover:underline"
        >
          {tenderTitle(bid)}
        </Link>
        <p className="text-muted line-clamp-1 text-xs">
          {[bid.tender.buyerName, place].filter(Boolean).join(" · ")}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted">Referencial</dt>
          <dd className="font-medium tabular-nums">
            {bid.tender.amount ? formatMoney(bid.tender.amount, bid.tender.currency) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Tu oferta</dt>
          <dd className="font-medium tabular-nums">
            {bid.offeredAmount !== null ? formatMoney(bid.offeredAmount, "PEN") : "Sin registrar"}
          </dd>
        </div>
      </dl>
      {deadline && <Deadline label={deadline.label} iso={deadline.iso} now={now} />}
      <div className="flex items-center justify-between gap-2">
        <QuickMove bid={bid} />
        {bid.assigneeEmail && <Initials email={bid.assigneeEmail} />}
      </div>
    </li>
  );
}

/** Bids still in play, one column per status (stacked on phones). */
export function OpenBidsBoard({ bids, now }: { bids: BidSummary[]; now: Date }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {OPEN_BID_STATUSES.map((status) => {
        const column = bids.filter((bid) => bid.status === status);
        const headingId = `columna-${status}`;
        return (
          <section
            key={status}
            aria-labelledby={headingId}
            className="bg-surface-muted/60 flex flex-col gap-3 rounded-2xl p-3"
          >
            <header className="flex items-baseline justify-between gap-2 px-1">
              <h2 id={headingId} className="text-sm font-semibold">
                {BID_STATUS[status].label}
              </h2>
              <span className="text-muted text-xs tabular-nums">{column.length}</span>
            </header>
            {column.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {column.map((bid) => (
                  <BidCard key={bid.id} bid={bid} now={now} />
                ))}
              </ul>
            ) : (
              <p className="text-muted px-1 pb-2 text-xs">{BID_STATUS[status].hint}.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Finished bids: results and amounts, the base of the history. */
export function ClosedBidsTable({ bids }: { bids: BidSummary[] }) {
  return (
    <Table caption="Postulaciones cerradas">
      <thead>
        <tr>
          <Th>Proceso</Th>
          <Th>Resultado</Th>
          <Th className="text-right">Tu oferta</Th>
          <Th className="text-right">Adjudicado</Th>
          <Th>Actualizado</Th>
        </tr>
      </thead>
      <tbody>
        {bids.map((bid) => {
          const status = BID_STATUS[bid.status];
          return (
            <tr key={bid.id}>
              <Td className="max-w-md">
                <Link
                  href={`/postulaciones/${bid.id}`}
                  className="line-clamp-2 font-medium hover:underline"
                >
                  {tenderTitle(bid)}
                </Link>
                <p className="text-muted line-clamp-1 text-xs">{bid.tender.buyerName}</p>
              </Td>
              <Td>
                <Badge tone={status.tone}>{status.label}</Badge>
                {bid.lostReason && (
                  <p className="text-muted mt-1 text-xs">{LOST_REASON[bid.lostReason]}</p>
                )}
              </Td>
              <Td className="text-right whitespace-nowrap tabular-nums">
                {bid.offeredAmount !== null ? formatMoney(bid.offeredAmount, "PEN") : "—"}
              </Td>
              <Td className="text-right whitespace-nowrap tabular-nums">
                {bid.awardedAmount !== null ? formatMoney(bid.awardedAmount, "PEN") : "—"}
              </Td>
              <Td className="text-muted whitespace-nowrap">
                {formatDateLima(new Date(bid.updatedAt))}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
