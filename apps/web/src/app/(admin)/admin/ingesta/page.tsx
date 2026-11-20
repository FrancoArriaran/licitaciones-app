import { formatDateLima } from "@licitaciones/core/shared";
import { Alert, Badge, Card, CardTitle, EmptyState, Table, Td, Th } from "@licitaciones/ui";
import type { Metadata } from "next";
import { getIngestionHealth } from "@/features/admin/data";

export const metadata: Metadata = { title: "Ingesta" };

const STATUS: Record<string, { label: string; tone: "success" | "neutral" | "danger" }> = {
  ok: { label: "Correcta", tone: "success" },
  not_published: { label: "Mes sin publicar", tone: "neutral" },
  error: { label: "Falló", tone: "danger" },
};

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

const count = (value: number) => value.toLocaleString("es-PE");

export default async function IngestionPage() {
  const health = await getIngestionHealth();
  const lastSuccess = health.lastSuccessAt;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">
          Ingesta de SEACE
        </h1>
        <p className="text-muted text-sm">
          Cada día a las 5:00 se descargan los últimos tres meses de SEACE. Aquí ves si funcionó.
        </p>
      </div>

      {health.stale && (
        <Alert tone="error" title="La sincronización no ha terminado bien en más de un día">
          Revisa el flujo &quot;Sincronizar SEACE&quot; en la pestaña Actions de GitHub. Mientras
          tanto, los clientes no reciben licitaciones nuevas.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle className="text-muted text-sm font-normal">Última carga correcta</CardTitle>
          <p className="mt-2 text-xl font-semibold">
            {lastSuccess
              ? `${formatDateLima(lastSuccess)}, ${timeFormatter.format(lastSuccess)}`
              : "Nunca"}
          </p>
        </Card>
        <Card>
          <CardTitle className="text-muted text-sm font-normal">Procesos en la base</CardTitle>
          <p className="mt-2 text-xl font-semibold tabular-nums">{count(health.tenderCount)}</p>
          {health.latestPublication && (
            <p className="text-muted text-xs">
              El más reciente, publicado el {formatDateLima(health.latestPublication)}
            </p>
          )}
        </Card>
        <Card>
          <CardTitle className="text-muted text-sm font-normal">Adjudicaciones</CardTitle>
          <p className="mt-2 text-xl font-semibold tabular-nums">{count(health.awardCount)}</p>
          <p className="text-muted text-xs">Base de la &quot;última contratación similar&quot;</p>
        </Card>
      </div>

      {health.runs.length === 0 ? (
        <EmptyState
          title="Sin corridas registradas"
          description="Cuando corra la sincronización diaria aparecerá aquí cada mes cargado."
        />
      ) : (
        <Table caption="Corridas recientes de la sincronización">
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Mes</Th>
              <Th>Estado</Th>
              <Th className="text-right">Procesos</Th>
              <Th className="text-right">Documentos</Th>
              <Th className="text-right">Adjudicaciones</Th>
            </tr>
          </thead>
          <tbody>
            {health.runs.map((run) => {
              const status = STATUS[run.status] ?? { label: run.status, tone: "neutral" as const };
              return (
                <tr key={run.id}>
                  <Td className="text-muted whitespace-nowrap">
                    {formatDateLima(run.ranAt)}, {timeFormatter.format(run.ranAt)}
                  </Td>
                  <Td className="tabular-nums">{run.period}</Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {run.errorMessage && (
                      <p className="text-muted mt-1 max-w-sm text-xs break-words">
                        {run.errorMessage}
                      </p>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{count(run.tenders)}</Td>
                  <Td className="text-right tabular-nums">{count(run.documents)}</Td>
                  <Td className="text-right tabular-nums">{count(run.awards)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
