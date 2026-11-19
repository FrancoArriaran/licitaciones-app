import { z } from "zod";
import {
  NotAuthorizedError,
  parseInput,
  rucSchema,
  ValidationError,
  type Clock,
  type UntrustedInput,
} from "../../shared";
import { RucAlreadyRegisteredError } from "../domain/errors";
import { canCreateOrganizations } from "../domain/permissions";
import { PLAN_CODES, type Actor, type OrganizationId } from "../domain/types";
import type { OrganizationRepository } from "../ports";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa la razón social.").max(200),
  ruc: rucSchema,
  planCode: z.enum(PLAN_CODES, "Elige un plan."),
  status: z.enum(["trial", "active"], "Elige si es prueba o contrato."),
  endsAt: z.coerce.date("Ingresa la fecha de fin de vigencia."),
  maxSeats: z.coerce
    .number("Ingresa un número de usuarios.")
    .int("Ingresa un número entero.")
    .min(1, "Debe tener al menos 1 usuario.")
    .max(100, "Máximo 100 usuarios."),
});

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;

export class CreateOrganization {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: Actor,
    input: UntrustedInput<CreateOrganizationInput>,
  ): Promise<OrganizationId> {
    if (!canCreateOrganizations(actor)) throw new NotAuthorizedError();

    const data = parseInput(createOrganizationSchema, input);
    const now = this.clock.now();
    if (data.endsAt <= now) {
      throw new ValidationError("Revisa los datos marcados en el formulario.", {
        endsAt: ["La fecha de fin debe ser posterior a hoy."],
      });
    }
    if (await this.organizations.existsWithRuc(data.ruc)) throw new RucAlreadyRegisteredError();

    return this.organizations.create({
      name: data.name,
      ruc: data.ruc,
      createdBy: actor.userId,
      subscription: {
        planCode: data.planCode,
        status: data.status,
        startsAt: now,
        endsAt: data.endsAt,
        maxSeats: data.maxSeats,
      },
    });
  }
}
