import { limaCalendar, type Clock } from "../../shared";
import {
  mergeDuplicateAlerts,
  tenderAlertTemplateParams,
  type PendingWhatsAppAlert,
} from "../domain/tender-alert";
import type { PendingWhatsAppAlerts, WhatsAppSender } from "../ports";

export interface FailedAlert {
  source: PendingWhatsAppAlert["source"];
  matchIds: number[];
  error: string;
}

export interface SendSummary {
  sent: number;
  /** Pending, but the recipient's hour hasn't come yet today. */
  waiting: number;
  failed: FailedAlert[];
  /** In a dry run, what would have been sent; nothing is sent or marked. */
  preview: { alert: PendingWhatsAppAlert; bodyParams: string[] }[];
}

/**
 * Replaces the n8n "Notificar matches pendientes" workflow: one WhatsApp template
 * message per pending match, then the match is marked as notified. A failed send
 * leaves its match pending, so the next run retries it; sent matches are never
 * repeated. Runs hourly: each recipient is served once their hour (Lima) arrives.
 */
export class SendWhatsAppAlerts {
  constructor(
    private readonly pending: PendingWhatsAppAlerts,
    private readonly sender: WhatsAppSender,
    private readonly clock: Clock,
  ) {}

  async execute({ dryRun = false }: { dryRun?: boolean } = {}): Promise<SendSummary> {
    const { hour } = limaCalendar(this.clock.now());
    const alerts = mergeDuplicateAlerts(await this.pending.list());
    const due = alerts.filter((alert) => alert.sendFromHour <= hour);
    const summary: SendSummary = {
      sent: 0,
      waiting: alerts.length - due.length,
      failed: [],
      preview: [],
    };

    for (const alert of due) {
      const bodyParams = tenderAlertTemplateParams(alert);
      if (dryRun) {
        summary.preview.push({ alert, bodyParams });
        continue;
      }
      try {
        await this.sender.sendTemplate({ to: alert.phone, bodyParams });
      } catch (error) {
        summary.failed.push({
          source: alert.source,
          matchIds: alert.matchIds,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      // Marked right after its own send: a crash later in the run can't cause a repeat.
      await this.pending.markNotified(alert.source, alert.matchIds, this.clock.now());
      summary.sent += 1;
    }

    return summary;
  }
}
