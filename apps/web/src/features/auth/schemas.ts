import { emailSchema } from "@licitaciones/core/shared";
import { z } from "zod";

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const requestResetSchema = z.object({ email: emailSchema });

/** Mirrors [auth] password rules in supabase/config.toml so users see the reason before submitting. */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Usa al menos 10 caracteres.")
      .regex(/[a-z]/, "Incluye al menos una minúscula.")
      .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
      .regex(/\d/, "Incluye al menos un número."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });
