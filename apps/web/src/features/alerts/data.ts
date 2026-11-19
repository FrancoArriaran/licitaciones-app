import "server-only";
import type { OrganizationId } from "@licitaciones/core/accounts";
import type { CatalogFamily } from "@licitaciones/core/alerts";
import { unwrap } from "@licitaciones/infra";
import { cache } from "react";
import { getDb } from "@/lib/session";
import type { Opportunity } from "./types";

/** Reads for the alerts screens. RLS scopes every query to the viewer's organization. */

export interface AlertProfileView {
  id: string;
  name: string;
  businessDescription: string;
  families: string[];
  departments: string[];
  minAmount: number | null;
  maxAmount: number | null;
  status: "active" | "paused";
}

const PROFILE_COLUMNS =
  "id, name, business_description, unspsc_families, departments, min_amount, max_amount, status";

function toProfile(row: {
  id: string;
  name: string;
  business_description: string;
  unspsc_families: string[];
  departments: string[];
  min_amount: number | null;
  max_amount: number | null;
  status: string;
}): AlertProfileView {
  return {
    id: row.id,
    name: row.name,
    businessDescription: row.business_description,
    families: row.unspsc_families,
    departments: row.departments,
    minAmount: row.min_amount,
    maxAmount: row.max_amount,
    status: row.status === "paused" ? "paused" : "active",
  };
}

export async function listAlertProfiles(
  organizationId: OrganizationId,
): Promise<AlertProfileView[]> {
  const db = await getDb();
  const rows = unwrap(
    "alert_profiles.list",
    await db
      .from("alert_profiles")
      .select(PROFILE_COLUMNS)
      .eq("organization_id", organizationId)
      .order("created_at"),
  );
  return rows.map(toProfile);
}

export async function getAlertProfile(
  organizationId: OrganizationId,
  id: string,
): Promise<AlertProfileView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const row = unwrap(
    "alert_profiles.get",
    await db
      .from("alert_profiles")
      .select(PROFILE_COLUMNS)
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle(),
  );
  return row ? toProfile(row) : null;
}

export async function getProfileQuota(
  organizationId: OrganizationId,
): Promise<{ maxProfiles: number | null; used: number }> {
  const db = await getDb();
  const rows = unwrap(
    "alert_profile_quota",
    await db.rpc("alert_profile_quota", { org: organizationId }),
  );
  return { maxProfiles: rows[0]?.max_profiles ?? null, used: rows[0]?.used ?? 0 };
}

/** The whole catalog (~400 rows) is small enough to search in the browser. */
export const listCatalog = cache(async (): Promise<CatalogFamily[]> => {
  const db = await getDb();
  return unwrap(
    "unspsc_families.list",
    await db
      .from("unspsc_families")
      .select("code, description")
      .order("tender_count", { ascending: false }),
  );
});

export interface NotificationSettingsView {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string | null;
  digestHour: number;
}

export async function getNotificationSettings(
  organizationId: OrganizationId,
): Promise<NotificationSettingsView> {
  const db = await getDb();
  const row = unwrap(
    "notification_settings.get",
    await db
      .from("notification_settings")
      .select("email_enabled, whatsapp_enabled, whatsapp_phone, digest_hour")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  );
  return {
    emailEnabled: row?.email_enabled ?? true,
    whatsappEnabled: row?.whatsapp_enabled ?? false,
    whatsappPhone: row?.whatsapp_phone ?? null,
    digestHour: row?.digest_hour ?? 7,
  };
}

/** Opportunities already matched to the organization's profiles, newest first. */
export async function listRecentMatches(
  organizationId: OrganizationId,
  limit = 30,
): Promise<Opportunity[]> {
  const db = await getDb();
  const rows = unwrap(
    "alert_matches.recent",
    await db
      .from("alert_matches")
      .select(
        "matched_at, alert_profiles(name), tenders(ocid, title, description, buyer_name, department, amount, currency, date_published, enquiry_end, unspsc_description)",
      )
      .eq("organization_id", organizationId)
      .order("matched_at", { ascending: false })
      .limit(limit),
  );
  // Both foreign keys are NOT NULL, so every match carries its tender and profile.
  return rows.map(({ tenders: tender, alert_profiles: profile }) => ({
    ocid: tender.ocid,
    title: tender.title,
    description: tender.description,
    buyerName: tender.buyer_name,
    department: tender.department,
    amount: tender.amount,
    currency: tender.currency,
    datePublished: tender.date_published,
    enquiryEnd: tender.enquiry_end,
    category: tender.unspsc_description,
    profileName: profile.name,
  }));
}
