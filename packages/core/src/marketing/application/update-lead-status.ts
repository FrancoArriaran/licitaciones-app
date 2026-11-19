import { z } from "zod";
import type { Actor } from "../../accounts";
import { NotAuthorizedError, parseInput, type UntrustedInput } from "../../shared";
import { LEAD_STATUSES, type LeadPipeline } from "../ports";

export const updateLeadStatusSchema = z.object({
  leadId: z.uuid("Solicitud no válida."),
  status: z.enum(LEAD_STATUSES, "Elige un estado."),
});

/** Our sales team moves each demo request through the pipeline. */
export class UpdateLeadStatus {
  constructor(private readonly leads: LeadPipeline) {}

  async execute(
    actor: Actor,
    input: UntrustedInput<z.input<typeof updateLeadStatusSchema>>,
  ): Promise<void> {
    if (!actor.isPlatformAdmin) throw new NotAuthorizedError();
    const { leadId, status } = parseInput(updateLeadStatusSchema, input);
    await this.leads.updateStatus(leadId, status);
  }
}
