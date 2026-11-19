import type {
  MatchSource,
  PendingWhatsAppAlert,
  PendingWhatsAppAlerts,
} from "@licitaciones/core/notifications";
import { unwrap, type DbClient } from "../supabase/client";

const PAGE_SIZE = 1000;
/** The n8n workflow ran at 7:00; prototype profiles keep that hour. */
const PROTOTYPE_HOUR = 7;

/** Reads every page: PostgREST caps a response at 1000 rows. */
async function readAll<T>(
  operation: string,
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[]; error: null } | { data: null; error: { message: string } }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const batch = unwrap(operation, await page(from, from + PAGE_SIZE - 1));
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

const toDate = (value: string | null) => (value ? new Date(value) : null);

/** Needs the secret key: the pending queue isn't readable by customers. */
export class SupabasePendingWhatsAppAlerts implements PendingWhatsAppAlerts {
  constructor(private readonly db: DbClient) {}

  async list() {
    const [alerts, prototype] = await Promise.all([this.alerts(), this.prototype()]);
    return [...alerts, ...prototype];
  }

  async markNotified(source: MatchSource, matchIds: readonly number[], at: Date) {
    const table = source === "alerts" ? "alert_matches" : "tender_matches";
    unwrap(
      "markNotified",
      await this.db
        .from(table)
        .update({ notified_at: at.toISOString() })
        .in("id", [...matchIds]),
    );
  }

  /** Customers who turned WhatsApp on (with consent) in Alertas > Canales. */
  private async alerts(): Promise<PendingWhatsAppAlert[]> {
    const rows = await readAll("listPendingAlertNotifications", (from, to) =>
      this.db
        .from("pending_alert_notifications")
        .select(
          "match_id, organization_id, organization_name, whatsapp_phone, digest_hour, ocid, title, buyer_name, amount, enquiry_end",
        )
        .eq("whatsapp_enabled", true)
        .not("whatsapp_phone", "is", null)
        .order("match_id")
        .range(from, to),
    );
    return rows.flatMap((row) =>
      row.whatsapp_phone
        ? [
            {
              source: "alerts" as const,
              matchIds: [row.match_id],
              recipientKey: row.organization_id,
              phone: row.whatsapp_phone,
              companyName: row.organization_name,
              sendFromHour: row.digest_hour ?? PROTOTYPE_HOUR,
              ocid: row.ocid,
              title: row.title,
              buyerName: row.buyer_name,
              amount: row.amount,
              enquiryEnd: toDate(row.enquiry_end),
            },
          ]
        : [],
    );
  }

  /** Same query as the n8n node "Traer matches pendientes". */
  private async prototype(): Promise<PendingWhatsAppAlert[]> {
    const rows = await readAll("listPendingTenderMatches", (from, to) =>
      this.db
        .from("tender_matches")
        .select(
          "id, ocid, profile:mype_profiles!inner(id, whatsapp_phone, company_name, status), tender:tenders!inner(title, buyer_name, amount, enquiry_end)",
        )
        .is("notified_at", null)
        .eq("profile.status", "active")
        .order("id")
        .range(from, to),
    );
    return rows.map((row) => ({
      source: "prototype" as const,
      matchIds: [row.id],
      recipientKey: String(row.profile.id),
      phone: row.profile.whatsapp_phone,
      companyName: row.profile.company_name,
      sendFromHour: PROTOTYPE_HOUR,
      ocid: row.ocid,
      title: row.tender.title,
      buyerName: row.tender.buyer_name,
      amount: row.tender.amount,
      enquiryEnd: toDate(row.tender.enquiry_end),
    }));
  }
}
