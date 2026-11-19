import type { OrganizationId, UserId } from "@licitaciones/core/accounts";
import type {
  AlertProfileDraft,
  AlertProfileId,
  AlertProfileRepository,
  CatalogFamily,
  FamilyCatalog,
  NotificationSettings,
  NotificationSettingsRepository,
} from "@licitaciones/core/alerts";
import { unwrap, type DbClient } from "../supabase/client";

/** All three run with the signed-in user's client: RLS scopes them to their organization. */

export class SupabaseFamilyCatalog implements FamilyCatalog {
  constructor(private readonly db: DbClient) {}

  async all(): Promise<CatalogFamily[]> {
    const rows = unwrap(
      "unspsc_families.all",
      await this.db
        .from("unspsc_families")
        .select("code, description")
        .order("tender_count", { ascending: false }),
    );
    return rows;
  }

  async existing(codes: readonly string[]): Promise<string[]> {
    if (codes.length === 0) return [];
    const rows = unwrap(
      "unspsc_families.existing",
      await this.db
        .from("unspsc_families")
        .select("code")
        .in("code", [...codes]),
    );
    return rows.map((row) => row.code);
  }
}

function toRow(profile: AlertProfileDraft) {
  return {
    name: profile.name,
    business_description: profile.businessDescription,
    unspsc_families: profile.families,
    departments: profile.departments,
    min_amount: profile.minAmount ?? null,
    max_amount: profile.maxAmount ?? null,
    status: profile.status,
  };
}

export class SupabaseAlertProfileRepository implements AlertProfileRepository {
  constructor(private readonly db: DbClient) {}

  async quota(organizationId: OrganizationId) {
    const rows = unwrap(
      "alert_profile_quota",
      await this.db.rpc("alert_profile_quota", { org: organizationId }),
    );
    const quota = rows[0];
    return { maxProfiles: quota?.max_profiles ?? null, used: quota?.used ?? 0 };
  }

  async create(
    organizationId: OrganizationId,
    profile: AlertProfileDraft,
    createdBy: UserId,
  ): Promise<AlertProfileId> {
    const row = unwrap(
      "alert_profiles.insert",
      await this.db
        .from("alert_profiles")
        .insert({ ...toRow(profile), organization_id: organizationId, created_by: createdBy })
        .select("id")
        .single(),
    );
    return row.id;
  }

  async update(
    organizationId: OrganizationId,
    id: AlertProfileId,
    profile: AlertProfileDraft,
  ): Promise<boolean> {
    const result = await this.db
      .from("alert_profiles")
      .update(toRow(profile), { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("id", id);
    unwrap("alert_profiles.update", result);
    return (result.count ?? 0) > 0;
  }
}

export class SupabaseNotificationSettingsRepository implements NotificationSettingsRepository {
  constructor(private readonly db: DbClient) {}

  async save(organizationId: OrganizationId, settings: NotificationSettings): Promise<void> {
    unwrap(
      "notification_settings.upsert",
      await this.db.from("notification_settings").upsert({
        organization_id: organizationId,
        email_enabled: settings.emailEnabled,
        whatsapp_enabled: settings.whatsappEnabled,
        whatsapp_phone: settings.whatsappPhone,
        whatsapp_opt_in_at: settings.whatsappOptInAt?.toISOString() ?? null,
        digest_hour: settings.digestHour,
      }),
    );
  }
}
