import { z } from "zod";
import {
  DomainError,
  emailSchema,
  parseInput,
  peruMobileSchema,
  rucSchema,
  type Clock,
  type UntrustedInput,
} from "../../shared";
import type { CaptchaVerifier, LeadRepository } from "../ports";

export const SELLS_TO_GOVERNMENT = ["yes", "no", "not_sure"] as const;

export const demoRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa tu nombre.").max(120),
  companyName: z.string().trim().min(2, "Ingresa el nombre de tu empresa.").max(200),
  ruc: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(rucSchema.optional()),
  jobTitle: z.string().trim().max(120).optional(),
  email: emailSchema,
  phone: peruMobileSchema,
  sector: z.string().trim().min(3, "Cuéntanos qué vende tu empresa.").max(500),
  sellsToGovernment: z.enum(SELLS_TO_GOVERNMENT, "Elige una opción."),
  /** Honeypot: hidden from people, bots fill it. */
  website: z.string().max(0).optional(),
  captchaToken: z.string(),
});

export type DemoRequestInput = z.input<typeof demoRequestSchema>;

export class CaptchaFailedError extends DomainError {
  readonly code = "captcha_failed";

  constructor() {
    super("No pudimos verificar que no eres un robot. Recarga la página e inténtalo de nuevo.");
  }
}

export class SubmitDemoRequest {
  constructor(
    private readonly leads: LeadRepository,
    private readonly captcha: CaptchaVerifier,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: UntrustedInput<DemoRequestInput>,
    context: { ip: string | null },
  ): Promise<void> {
    const { captchaToken, website: _honeypot, ...lead } = parseInput(demoRequestSchema, input);
    if (!(await this.captcha.verify(captchaToken, context.ip))) throw new CaptchaFailedError();

    await this.leads.save({
      ...lead,
      ruc: lead.ruc ?? null,
      jobTitle: lead.jobTitle || null,
      source: "demo_form",
      createdAt: this.clock.now(),
    });
  }
}
