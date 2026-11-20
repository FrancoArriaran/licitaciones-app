/**
 * Daily SEACE ingestion (05:00 Lima): the current month and the two before it.
 * Replaces the n8n "SEACE - Sincronización diaria" workflow. Usage: pnpm jobs:sync
 */
import { syncTenders } from "./composition";
import { printSummary } from "./print-summary";

const summary = await syncTenders().execute();
printSummary(summary);
if (summary.failed) process.exitCode = 1;
