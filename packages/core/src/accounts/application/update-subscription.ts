import { z } from "zod";
import { NotAuthorizedError, parseInput, type UntrustedInput } from "../../shared";
import { SeatsBelowUsageError } from "../domain/errors";
import { canManageSubscriptions } from "../domain/permissions";
import {
  PLAN_CODES,
  SUBSCRIPTION_STATUSES,
  type Actor,
  type OrganizationId,
} from "../domain/types";
import type { OrganizationRepository } from "../ports";

export const updateSubscriptionSchema = z.object({
  planCode: z.enum(PLAN_CODES, "Elige un plan."),
  status: z.enum(SUBSCRIPTION_STATUSES, "Elige un estado."),
  endsAt: z.coerce.date("Ingresa la fecha de fin de vigencia."),
  maxSeats: z.coerce
    .number("Ingresa un número de usuarios.")
    .int("Ingresa un número entero.")
    .min(1, "Debe tener al menos 1 usuario.")
    .max(100, "Máximo 100 usuarios."),
});

export type UpdateSubscriptionInput = z.input<typeof updateSubscriptionSchema>;

/** Renewals, plan changes, pauses and cancellations, done by our staff from the backoffice. */
export class UpdateSubscription {
  constructor(private readonly organizations: OrganizationRepository) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    input: UntrustedInput<UpdateSubscriptionInput>,
  ): Promise<void> {
    if (!canManageSubscriptions(actor)) throw new NotAuthorizedError();
    const data = parseInput(updateSubscriptionSchema, input);

    const seats = await this.organizations.getSeatUsage(organizationId);
    if (data.maxSeats < seats.used) throw new SeatsBelowUsageError(seats.used);

    await this.organizations.updateSubscription(organizationId, data);
  }
}
