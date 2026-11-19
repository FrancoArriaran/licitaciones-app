import type { z } from "zod";
import { ValidationError } from "./errors";

/** Shape of raw form/HTTP input before validation: known keys, values not yet trusted. */
export type UntrustedInput<T> = { readonly [K in keyof T]?: unknown };

/** Parses untrusted input, turning Zod issues into a ValidationError the UI can map to fields. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw new ValidationError("Revisa los datos marcados en el formulario.", fieldErrors);
}
