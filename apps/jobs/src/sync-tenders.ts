/**
 * Daily SEACE ingestion (05:00 Lima). Replaces the n8n "SEACE - Sincronización diaria"
 * workflow. Usage: pnpm jobs:sync
 */
import { syncTenders } from "./composition";

const summary = await syncTenders().execute();

for (const run of summary.runs) {
  const month = `${run.period.year}-${String(run.period.month).padStart(2, "0")}`;
  const detail = run.errorMessage ? ` (${run.errorMessage})` : "";
  console.log(
    `${month}: ${run.status}, ${run.tenders} procesos, ${run.documents} documentos${detail}`,
  );
}
if (summary.matches) {
  console.log(
    `Coincidencias nuevas: ${summary.matches.alerts} de clientes, ${summary.matches.prototype} del prototipo`,
  );
}

if (summary.failed) {
  console.error("La sincronización terminó con errores.");
  process.exitCode = 1;
}
