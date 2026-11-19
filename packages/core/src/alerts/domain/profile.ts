import { z } from "zod";
import { isDepartmentCode } from "./departments";

export const MAX_FAMILIES_PER_PROFILE = 10;

const optionalAmount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce
    .number("Ingresa un monto en soles.")
    .min(0, "El monto no puede ser negativo.")
    .optional(),
);

export const alertProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Ponle un nombre corto, por ejemplo «Cemento Arequipa».")
      .max(80),
    businessDescription: z
      .string()
      .trim()
      .min(10, "Cuéntanos qué vende tu empresa en al menos una frase.")
      .max(1000, "Máximo 1000 caracteres."),
    families: z
      .array(z.string().regex(/^\d{4}$/))
      .min(1, "Elige al menos una categoría.")
      .max(MAX_FAMILIES_PER_PROFILE, `Elige como máximo ${MAX_FAMILIES_PER_PROFILE} categorías.`)
      .transform((codes) => [...new Set(codes)]),
    departments: z
      .array(z.string().refine(isDepartmentCode, "Departamento no válido."))
      .transform((codes) => [...new Set(codes)]),
    minAmount: optionalAmount,
    maxAmount: optionalAmount,
    status: z.enum(["active", "paused"]).default("active"),
  })
  .refine(
    (data) =>
      data.minAmount === undefined ||
      data.maxAmount === undefined ||
      data.minAmount <= data.maxAmount,
    { path: ["maxAmount"], message: "El monto máximo debe ser mayor o igual al mínimo." },
  );

export type AlertProfileInput = z.input<typeof alertProfileSchema>;
export type AlertProfileDraft = z.output<typeof alertProfileSchema>;
