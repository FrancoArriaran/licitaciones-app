import { departmentLabel } from "@licitaciones/core/alerts";
import {
  formatDateLima,
  formatMoney,
  formatQuantity,
  formatTenderDescription,
} from "@licitaciones/core/shared";
import { Card, Table, Td, Th } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryDeadline } from "@/features/alerts/components/opportunity-list";
import { FollowButton } from "@/features/bids/components/follow-button";
import { findBidForTender } from "@/features/bids/data";
import { SimilarAwards } from "@/features/opportunities/components/similar-awards";
import { getOpportunity, listSimilarAwards } from "@/features/opportunities/data";
import { requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Oportunidad" };

/** Only links to SEACE's own servers are shown. */
function isSeaceUrl(url: string | null): url is string {
  return url !== null && /^https:\/\/([\w-]+\.)*seace\.gob\.pe(:\d+)?\//.test(url);
}

export default async function OpportunityPage({ params }: { params: Promise<{ ocid: string }> }) {
  const [{ organization }, { ocid: rawOcid }] = await Promise.all([requireMembership(), params]);
  const ocid = decodeURIComponent(rawOcid);
  const [opportunity, similar, bid] = await Promise.all([
    getOpportunity(ocid),
    listSimilarAwards(ocid),
    findBidForTender(organization.id, ocid),
  ]);
  if (!opportunity) notFound();

  const place = [
    opportunity.locality,
    opportunity.department && departmentLabel(opportunity.department),
  ]
    .filter(Boolean)
    .join(", ");
  const documents = opportunity.documents.flatMap(({ url, ...document }) =>
    isSeaceUrl(url) ? [{ ...document, url }] : [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/inicio" className="text-primary text-sm hover:underline">
          ← Inicio
        </Link>
        <h1 className="font-display mt-2 text-[1.5rem] leading-tight font-semibold tracking-[-0.01em] text-pretty">
          {opportunity.description
            ? formatTenderDescription(opportunity.description)
            : (opportunity.title ?? "Proceso sin descripción")}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {[opportunity.buyerName, place].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-4">
          <FollowButton ocid={opportunity.ocid} bid={bid} />
        </div>
      </div>

      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Valor referencial</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {opportunity.amount
                ? formatMoney(opportunity.amount, opportunity.currency)
                : "Sin valor publicado"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Consultas y observaciones</dt>
            <dd className="mt-1">
              {opportunity.enquiryEnd ? (
                <EnquiryDeadline iso={opportunity.enquiryEnd} now={new Date()} />
              ) : (
                "Por confirmar"
              )}
            </dd>
          </div>
          {opportunity.procurementMethod && (
            <div>
              <dt className="text-muted">Tipo de proceso</dt>
              <dd className="mt-0.5">{opportunity.procurementMethod}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Código SEACE</dt>
            <dd className="mt-0.5 tabular-nums">{opportunity.title ?? "—"}</dd>
          </div>
          {opportunity.datePublished && (
            <div>
              <dt className="text-muted">Publicado</dt>
              <dd className="mt-0.5">{formatDateLima(new Date(opportunity.datePublished))}</dd>
            </div>
          )}
        </dl>
      </Card>

      <SimilarAwards awards={similar} />

      {opportunity.items.length > 0 && (
        <section aria-labelledby="items" className="flex flex-col gap-3">
          <h2 id="items" className="text-lg font-semibold">
            Qué se compra
          </h2>
          <Table caption="Ítems del proceso">
            <thead>
              <tr>
                <Th>Descripción</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="text-right">Valor referencial</Th>
              </tr>
            </thead>
            <tbody>
              {opportunity.items.map((item) => (
                <tr key={item.id}>
                  <Td>{item.description ? formatTenderDescription(item.description) : "—"}</Td>
                  <Td className="text-right whitespace-nowrap tabular-nums">
                    {item.quantity !== null
                      ? `${formatQuantity(item.quantity)} ${item.unitName?.toLocaleLowerCase("es-PE") ?? ""}`
                      : "—"}
                  </Td>
                  <Td className="text-right whitespace-nowrap tabular-nums">
                    {item.amount ? formatMoney(item.amount, opportunity.currency) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section aria-labelledby="documentos" className="flex flex-col gap-3">
        <h2 id="documentos" className="text-lg font-semibold">
          Documentos
        </h2>
        {documents.length > 0 ? (
          <Card className="p-0">
            <ul className="divide-border divide-y">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{document.title ?? "Documento"}</p>
                    {document.datePublished && (
                      <p className="text-muted text-xs">
                        {formatDateLima(new Date(document.datePublished))}
                      </p>
                    )}
                  </div>
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary shrink-0 text-sm font-medium hover:underline"
                  >
                    Descargar
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="text-muted text-sm">SEACE no ha publicado documentos para este proceso.</p>
        )}
      </section>
    </div>
  );
}
