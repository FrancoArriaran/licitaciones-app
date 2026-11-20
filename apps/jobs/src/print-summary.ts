import type { SyncSummary } from "@licitaciones/core/ingestion";

export function printSummary(summary: SyncSummary): void {
  for (const run of summary.runs) {
    const month = `${run.period.year}-${String(run.period.month).padStart(2, "0")}`;
    const detail = run.errorMessage ? ` (${run.errorMessage})` : "";
    console.log(
      `${month}: ${run.status}, ${run.tenders} procesos, ${run.documents} documentos, ${run.awards} adjudicaciones${detail}`,
    );
  }
  if (summary.matches) {
    console.log(
      `Coincidencias nuevas: ${summary.matches.alerts} de clientes, ${summary.matches.prototype} del prototipo`,
    );
  }
  if (summary.detectedResults) {
    console.log(
      `Resultados de SEACE anotados en postulaciones: ${String(summary.detectedResults)}`,
    );
  }
  if (summary.failed) console.error("La sincronización terminó con errores.");
}
