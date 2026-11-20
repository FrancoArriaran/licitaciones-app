import { isOpenStatus, OPEN_BID_STATUSES } from "@licitaciones/core/bids";
import { formatTenderDescription } from "@licitaciones/core/shared";
import { Badge, buttonVariants, Card } from "@licitaciones/ui";
import Link from "next/link";
import type { BidSummary } from "../data";
import { BID_STATUS } from "../labels";
import { Deadline, nextDeadline } from "./deadline";

const title = (bid: BidSummary) =>
  bid.tender.description
    ? formatTenderDescription(bid.tender.description)
    : (bid.tender.title ?? "Proceso sin descripción");

/**
 * What needs attention today, before new opportunities: results to confirm and the
 * closest deadlines. Hidden when the company has no bids in play.
 */
export function BidsOverview({ bids, now }: { bids: BidSummary[]; now: Date }) {
  const open = bids.filter((bid) => isOpenStatus(bid.status));
  if (open.length === 0) return null;

  const toConfirm = open.filter((bid) => bid.resultDetected);
  const upcoming = open
    .flatMap((bid) => {
      const deadline = nextDeadline(bid.tender, now);
      return deadline && !bid.resultDetected ? [{ bid, deadline }] : [];
    })
    .sort((a, b) => a.deadline.iso.localeCompare(b.deadline.iso))
    .slice(0, 3);

  return (
    <section aria-labelledby="postulaciones-hoy" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="postulaciones-hoy" className="text-lg font-semibold">
            Tus postulaciones
          </h2>
          <p className="text-muted text-sm">
            {OPEN_BID_STATUSES.map((status) => {
              const count = open.filter((bid) => bid.status === status).length;
              return `${String(count)} ${BID_STATUS[status].label.toLocaleLowerCase("es-PE")}`;
            }).join(" · ")}
          </p>
        </div>
        <Link href="/postulaciones" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Ver tablero
        </Link>
      </div>

      {(toConfirm.length > 0 || upcoming.length > 0) && (
        <Card className="p-0">
          <ul className="divide-border divide-y">
            {toConfirm.map((bid) => (
              <li
                key={bid.id}
                className="flex flex-col gap-1.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/postulaciones/${bid.id}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {title(bid)}
                </Link>
                <Badge tone="info" className="shrink-0">
                  Resultado publicado · confirmar
                </Badge>
              </li>
            ))}
            {upcoming.map(({ bid, deadline }) => (
              <li
                key={bid.id}
                className="flex flex-col gap-1.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/postulaciones/${bid.id}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {title(bid)}
                </Link>
                <span className="shrink-0">
                  <Deadline label={deadline.label} iso={deadline.iso} now={now} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
