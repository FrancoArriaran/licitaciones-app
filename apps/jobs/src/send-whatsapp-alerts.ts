/**
 * Sends pending WhatsApp alerts. Replaces the n8n "Notificar matches pendientes"
 * workflow. Runs every hour; each recipient gets theirs from their chosen hour.
 * Usage: pnpm jobs:notify            (sends)
 *        pnpm jobs:notify --dry-run  (only lists what would be sent)
 */
import { sendWhatsAppAlerts } from "./composition";

const dryRun = process.argv.includes("--dry-run");
const summary = await sendWhatsAppAlerts({ dryRun }).execute({ dryRun });

/** Logs may be shared (CI): never print full phone numbers. */
const maskPhone = (phone: string) =>
  `${"*".repeat(Math.max(phone.length - 3, 0))}${phone.slice(-3)}`;

for (const { alert, bodyParams } of summary.preview) {
  console.log(`[dry run] ${maskPhone(alert.phone)} (${alert.source}): ${bodyParams.join(" | ")}`);
}
console.log(
  `${dryRun ? "Por enviar" : "Enviados"}: ${dryRun ? summary.preview.length : summary.sent}. ` +
    `Esperando su hora: ${summary.waiting}. Fallidos: ${summary.failed.length}.`,
);
for (const failure of summary.failed) {
  console.error(`No se envió (${failure.source} ${failure.matchIds.join(",")}): ${failure.error}`);
}

if (summary.failed.length > 0) process.exitCode = 1;
