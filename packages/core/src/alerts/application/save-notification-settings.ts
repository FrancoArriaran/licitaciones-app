import { z } from "zod";
import { canManageOrganizationSettings, type Actor, type OrganizationId } from "../../accounts";
import {
  NotAuthorizedError,
  parseInput,
  peruMobileSchema,
  type Clock,
  type UntrustedInput,
} from "../../shared";
import type { NotificationSettingsRepository } from "../ports";

const checkbox = z.preprocess(
  (value) => value === true || value === "on" || value === "true",
  z.boolean(),
);

export const notificationSettingsSchema = z
  .object({
    emailEnabled: checkbox,
    whatsappEnabled: checkbox,
    whatsappPhone: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      peruMobileSchema.optional(),
    ),
    whatsappConsent: checkbox,
    digestHour: z.coerce
      .number("Elige una hora.")
      .int()
      .min(5, "Elige una hora entre las 5:00 y las 20:00.")
      .max(20, "Elige una hora entre las 5:00 y las 20:00."),
  })
  .superRefine((data, ctx) => {
    if (!data.whatsappEnabled) return;
    if (!data.whatsappPhone) {
      ctx.addIssue({
        code: "custom",
        path: ["whatsappPhone"],
        message: "Ingresa el celular que recibirá las alertas.",
      });
    }
    if (!data.whatsappConsent) {
      ctx.addIssue({
        code: "custom",
        path: ["whatsappConsent"],
        message: "Necesitamos tu autorización para escribirte por WhatsApp.",
      });
    }
  });

export type NotificationSettingsInput = z.input<typeof notificationSettingsSchema>;

/** Channels and time for the daily summary. WhatsApp requires recorded consent. */
export class SaveNotificationSettings {
  constructor(
    private readonly settings: NotificationSettingsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    input: UntrustedInput<NotificationSettingsInput>,
  ): Promise<void> {
    if (!canManageOrganizationSettings(actor)) throw new NotAuthorizedError();
    const data = parseInput(notificationSettingsSchema, input);

    await this.settings.save(organizationId, {
      emailEnabled: data.emailEnabled,
      whatsappEnabled: data.whatsappEnabled,
      whatsappPhone: data.whatsappPhone ?? null,
      whatsappOptInAt: data.whatsappEnabled ? this.clock.now() : null,
      digestHour: data.digestHour,
    });
  }
}
