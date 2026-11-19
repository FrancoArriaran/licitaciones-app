import { z } from "zod";
import { isValidRuc, normalizeRuc, type Ruc } from "./ruc";

/** Accepts "20131312955" or "20-131312955-5"; outputs a validated Ruc. */
export const rucSchema = z.string("Ingresa el RUC.").transform((value, ctx): Ruc => {
  const normalized = normalizeRuc(value);
  if (!isValidRuc(normalized)) {
    ctx.addIssue({ code: "custom", message: "El RUC no es válido. Revisa los 11 dígitos." });
    return z.NEVER;
  }
  return normalized;
});

export const emailSchema = z
  .string("Ingresa un correo.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresa un correo válido."));

/** Peruvian mobile: 9 digits starting with 9, with or without +51. Outputs E.164 (+51XXXXXXXXX). */
export const peruMobileSchema = z
  .string("Ingresa un número de celular.")
  .transform((value, ctx) => {
    const digits = value.replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "");
    if (!/^9\d{8}$/.test(digits)) {
      ctx.addIssue({
        code: "custom",
        message: "Ingresa un celular peruano de 9 dígitos, por ejemplo 987 654 321.",
      });
      return z.NEVER;
    }
    return `+51${digits}`;
  });
