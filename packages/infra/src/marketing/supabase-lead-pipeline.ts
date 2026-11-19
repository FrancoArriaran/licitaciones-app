import type { LeadPipeline, LeadStatus } from "@licitaciones/core/marketing";
import { NotFoundError } from "@licitaciones/core/shared";
import { unwrap, type DbClient } from "../supabase/client";

/** Runs with the signed-in staff member's client; the leads_update policy allows staff only. */
export class SupabaseLeadPipeline implements LeadPipeline {
  constructor(private readonly db: DbClient) {}

  async updateStatus(leadId: string, status: LeadStatus): Promise<void> {
    const result = await this.db
      .from("leads")
      .update({ status }, { count: "exact" })
      .eq("id", leadId);
    unwrap("leads.updateStatus", result);
    if (result.count === 0) throw new NotFoundError("No encontramos esa solicitud.");
  }
}
