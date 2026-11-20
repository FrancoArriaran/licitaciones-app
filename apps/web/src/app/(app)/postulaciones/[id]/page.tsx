import { canDeleteBids, canWorkOnBids, hasProductAccess } from "@licitaciones/core/accounts";
import { departmentLabel } from "@licitaciones/core/alerts";
import { BID_STATUSES, type BidStatus } from "@licitaciones/core/bids";
import { formatMoney, formatTenderDescription } from "@licitaciones/core/shared";
import { Badge, Card, CardTitle } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listTeamMembers } from "@/features/accounts/data";
import { addBidNote, updateBid } from "@/features/bids/actions";
import { BidDetailsForm } from "@/features/bids/components/bid-details-form";
import { BidDocuments } from "@/features/bids/components/bid-documents";
import { DetectedResultBanner } from "@/features/bids/components/detected-result-banner";
import { BidTimeline } from "@/features/bids/components/bid-timeline";
import { Deadline } from "@/features/bids/components/deadline";
import { NoteForm } from "@/features/bids/components/note-form";
import { RemoveBidButton } from "@/features/bids/components/remove-bid-button";
import { getBid } from "@/features/bids/data";
import { BID_STATUS } from "@/features/bids/labels";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Postulación" };

function isStatus(value: string | undefined): value is BidStatus {
  return (BID_STATUSES as readonly string[]).includes(value ?? "");
}

export default async function BidPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultado?: string }>;
}) {
  const [{ organization, subscription }, { id }, query] = await Promise.all([
    requireMembership(),
    params,
    searchParams,
  ]);
  const [bid, actor, members] = await Promise.all([
    getBid(organization.id, id),
    getActor(organization.id),
    listTeamMembers(organization.id),
  ]);
  if (!bid) notFound();

  const now = new Date();
  const canEdit = canWorkOnBids(actor) && hasProductAccess(subscription, now);
  const team = members
    .filter((member) => member.joinedAt !== null)
    .map(({ userId, email }) => ({ userId, email }));
  const status = BID_STATUS[bid.status];
  const { tender } = bid;
  const initialStatus = isStatus(query.resultado) ? query.resultado : bid.status;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/postulaciones" className="text-primary text-sm hover:underline">
          ← Postulaciones
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {tender.title && <span className="text-muted text-xs tabular-nums">{tender.title}</span>}
        </div>
        <h1 className="font-display mt-2 text-[1.5rem] leading-tight font-semibold tracking-[-0.01em] text-pretty">
          {tender.description
            ? formatTenderDescription(tender.description)
            : (tender.title ?? "Proceso sin descripción")}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {[tender.buyerName, tender.department && departmentLabel(tender.department)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Valor referencial:{" "}
            <strong className="tabular-nums">
              {tender.amount ? formatMoney(tender.amount, tender.currency) : "sin publicar"}
            </strong>
          </span>
          <Deadline label="Consultas hasta" iso={tender.enquiryEnd} now={now} />
          <Deadline label="Ofertas hasta" iso={tender.tenderEnd} now={now} />
          <Link
            href={`/oportunidades/${tender.ocid}`}
            className="text-primary font-medium hover:underline"
          >
            Ver ficha y bases →
          </Link>
        </div>
      </div>

      {bid.detectedResult && canEdit && (
        <DetectedResultBanner bid={bid} result={bid.detectedResult} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="documentos" className="flex flex-col gap-3">
            <h2 id="documentos" className="text-lg font-semibold">
              Tus documentos
            </h2>
            <BidDocuments bidId={bid.id} documents={bid.documents} canEdit={canEdit} />
          </section>

          <section aria-labelledby="historial" className="flex flex-col gap-3">
            <h2 id="historial" className="text-lg font-semibold">
              Historial
            </h2>
            <Card className="flex flex-col gap-5">
              {canEdit && <NoteForm action={addBidNote.bind(null, bid.id)} />}
              <BidTimeline events={bid.events} team={team} />
            </Card>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card>
            <CardTitle>Estado de la postulación</CardTitle>
            <div className="mt-4">
              {canEdit ? (
                <BidDetailsForm
                  bid={bid}
                  team={team}
                  initialStatus={initialStatus}
                  action={updateBid.bind(null, bid.id)}
                />
              ) : (
                <p className="text-muted text-sm">
                  Tu plan no está vigente: puedes revisar esta postulación, pero no modificarla.
                </p>
              )}
            </div>
          </Card>
          {canEdit && canDeleteBids(actor) && <RemoveBidButton bidId={bid.id} />}
        </aside>
      </div>
    </div>
  );
}
