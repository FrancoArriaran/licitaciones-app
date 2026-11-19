/** Where a pending match lives: customers' alert profiles or the n8n prototype profiles. */
export type MatchSource = "alerts" | "prototype";

/** One tender to announce to one WhatsApp number. */
export interface PendingWhatsAppAlert {
  source: MatchSource;
  /** Matches this message settles. Several when two profiles of a company caught the same tender. */
  matchIds: number[];
  /** Organization (alerts) or prototype profile the message is for. */
  recipientKey: string;
  phone: string;
  companyName: string;
  /** Lima hour from which it may be sent (the customer's digest hour; 7 for the prototype). */
  sendFromHour: number;
  ocid: string;
  /** SEACE process code, the same value n8n sent. */
  title: string | null;
  buyerName: string | null;
  amount: number | null;
  enquiryEnd: Date | null;
}

/**
 * Body parameters of the approved Meta template `licitacion_nueva`, in its order:
 * company, process, buyer, amount, enquiry deadline. Same texts the n8n node
 * "Armar mensaje WhatsApp" produced.
 */
export function tenderAlertTemplateParams(alert: PendingWhatsAppAlert): string[] {
  return [
    alert.companyName,
    alert.title ?? "",
    alert.buyerName ?? "",
    alert.amount === null
      ? "0.00"
      : alert.amount.toLocaleString("es-PE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    alert.enquiryEnd
      ? alert.enquiryEnd.toLocaleDateString("es-PE", { timeZone: "America/Lima" })
      : "por confirmar",
  ];
}

/** Two profiles of one company matching the same tender produce a single message. */
export function mergeDuplicateAlerts(
  alerts: readonly PendingWhatsAppAlert[],
): PendingWhatsAppAlert[] {
  const merged = new Map<string, PendingWhatsAppAlert>();
  for (const alert of alerts) {
    const key = [alert.source, alert.recipientKey, alert.phone, alert.ocid].join("|");
    const existing = merged.get(key);
    if (existing) {
      existing.matchIds.push(...alert.matchIds);
      existing.sendFromHour = Math.min(existing.sendFromHour, alert.sendFromHour);
    } else {
      merged.set(key, { ...alert, matchIds: [...alert.matchIds] });
    }
  }
  return [...merged.values()];
}
