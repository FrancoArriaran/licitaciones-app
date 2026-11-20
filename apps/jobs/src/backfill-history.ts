/**
 * Loads past months (tenders, items and awards; documents only for recent months),
 * so "la última contratación similar" has history to look at. Idempotent: running it
 * again only updates. Usage: pnpm jobs:backfill 2025-11 2026-08
 */
import { monthRange, parsePeriod } from "@licitaciones/core/ingestion";
import { syncTenders } from "./composition";
import { printSummary } from "./print-summary";

const [from, to] = process.argv.slice(2).map(parsePeriod);
if (!from || !to) {
  console.error("Indica el rango de meses: pnpm jobs:backfill 2025-11 2026-08");
  process.exit(1);
}

const summary = await syncTenders().execute({ periods: monthRange(from, to) });
printSummary(summary);
if (summary.failed) process.exitCode = 1;
