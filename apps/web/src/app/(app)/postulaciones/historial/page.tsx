import { hasProductAccess } from "@licitaciones/core/accounts";
import { formatDateLima, formatMoney, formatTenderDescription } from "@licitaciones/core/shared";
import { Badge, Card, EmptyState, Table, Td, Th } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ImportHistoryButton } from "@/features/bids/components/import-history-button";
import { bidsUseCases } from "@/lib/composition";
import { getActor, requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Tu historial en SEACE" };

const OUTCOME = {
  won: { label: "Ganada", tone: "success" },
  lost: { label: "No ganada", tone: "danger" },
  pending: { label: "Sin resultado aún", tone: "neutral" },
} as const;

/** Shown in full up to this many rows; the import always takes them all. */
const VISIBLE_ROWS = 100;

export default async function SeaceHistoryPage() {
  const { organization, subscription } = await requireMembership();
  const actor = await getActor(organization.id);
  const history = await (await bidsUseCases()).importHistory.preview(actor, organization.id);

  const won = history.filter((item) => item.outcome === "won");
  const wonAmount = won.reduce((sum, item) => sum + (item.awardedAmount ?? 0), 0);
  const pending = history.filter((item) => !item.alreadyTracked);
  const canImport = pending.length > 0 && hasProductAccess(subscription, new Date());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/postulaciones" className="text-primary text-sm hover:underline">
          ← Postulaciones
        </Link>
        <h1 className="font-display mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Tu historial en SEACE
        </h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          Los procesos del último año en los que el RUC {organization.ruc} presentó oferta o ganó.
          Agrégalos a tus postulaciones para tener tu historia completa y ver en qué te va mejor.
        </p>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="No encontramos participaciones de tu RUC en el último año"
          description="Si postulaste en consorcio, SEACE no publica quiénes lo integran: registra esas postulaciones desde la ficha de cada oportunidad."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-muted text-sm">Procesos en los que participaste</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{history.length}</p>
            </Card>
            <Card>
              <p className="text-muted text-sm">Ganados</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {won.length}
                <span className="text-muted text-base font-normal">
                  {" "}
                  ({Math.round((won.length / history.length) * 100)} %)
                </span>
              </p>
            </Card>
            <Card>
              <p className="text-muted text-sm">Monto adjudicado</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatMoney(wonAmount, "PEN")}
              </p>
            </Card>
          </div>

          {canImport ? (
            <ImportHistoryButton count={pending.length} />
          ) : (
            pending.length === 0 && (
              <p className="text-muted text-sm">
                Todos estos procesos ya están en tus postulaciones.
              </p>
            )
          )}

          <Table caption="Procesos de tu historial en SEACE">
            <thead>
              <tr>
                <Th>Proceso</Th>
                <Th>Resultado</Th>
                <Th className="text-right">Adjudicado a ti</Th>
                <Th>Publicado</Th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, VISIBLE_ROWS).map((item) => (
                <tr key={item.ocid}>
                  <Td className="max-w-md">
                    <Link
                      href={`/oportunidades/${item.ocid}`}
                      className="line-clamp-2 font-medium hover:underline"
                    >
                      {item.description
                        ? formatTenderDescription(item.description)
                        : (item.title ?? "Proceso sin descripción")}
                    </Link>
                    <p className="text-muted line-clamp-1 text-xs">{item.buyerName}</p>
                  </Td>
                  <Td>
                    <Badge tone={OUTCOME[item.outcome].tone}>{OUTCOME[item.outcome].label}</Badge>
                    {item.alreadyTracked && (
                      <p className="text-muted mt-1 text-xs">Ya en tus postulaciones</p>
                    )}
                  </Td>
                  <Td className="text-right whitespace-nowrap tabular-nums">
                    {item.awardedAmount !== null ? formatMoney(item.awardedAmount, "PEN") : "—"}
                  </Td>
                  <Td className="text-muted whitespace-nowrap">
                    {item.datePublished ? formatDateLima(new Date(item.datePublished)) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {history.length > VISIBLE_ROWS && (
            <p className="text-muted text-xs">
              Se muestran los {VISIBLE_ROWS} más recientes de {history.length}. Al agregarlos se
              incluyen todos.
            </p>
          )}
        </>
      )}
    </div>
  );
}
