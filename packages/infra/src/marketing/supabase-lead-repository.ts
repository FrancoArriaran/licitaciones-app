import type { Lead, LeadRepository } from "@licitaciones/core/marketing";
import { unwrap, type DbClient } from "../supabase/client";

/** Uses the service-role client: leads come from anonymous visitors after the captcha check. */
export class SupabaseLeadRepository implements LeadRepository {
  constructor(private readonly admin: DbClient) {}

  async save(lead: Lead): Promise<void> {
    unwrap(
      "leads.insert",
      await this.admin.from("leads").insert({
        full_name: lead.fullName,
        company_name: lead.companyName,
        ruc: lead.ruc,
        job_title: lead.jobTitle,
        email: lead.email,
        phone: lead.phone,
        sector: lead.sector,
        sells_to_government: lead.sellsToGovernment,
        source: lead.source,
        created_at: lead.createdAt.toISOString(),
      }),
    );
  }
}
