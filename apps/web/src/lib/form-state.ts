import { DomainError, ValidationError } from "@licitaciones/core/shared";
import { unstable_rethrow } from "next/navigation";

export type FormState =
  | { status: "idle" }
  | {
      status: "success";
      message: string;
      /** One-time sign-in link to hand to an invited person (copy or WhatsApp). */
      invitationLink?: string;
      /** Where to go next, e.g. the organization just created. */
      href?: string;
    }
  | {
      status: "error";
      message: string;
      fieldErrors: Readonly<Record<string, string[]>>;
      /** Echoed back so the form keeps what the user typed (never includes passwords). */
      values: Readonly<Record<string, string>>;
    };

export const idleState: FormState = { status: "idle" };

export function formValues(
  formData: FormData,
  omit: readonly string[] = [],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !omit.includes(key) && !key.startsWith("$")) {
      values[key] = value;
    }
  }
  return values;
}

/**
 * Expected failures (DomainError) are shown as-is. Anything else is logged with a
 * reference the user can quote to support, and the user sees a generic message.
 */
export function toFormError(error: unknown, values: Record<string, string> = {}): FormState {
  // redirect()/notFound() work by throwing; let Next.js handle them.
  unstable_rethrow(error);
  if (error instanceof DomainError) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: error instanceof ValidationError ? error.fieldErrors : {},
      values,
    };
  }
  const reference = crypto.randomUUID().slice(0, 8);
  console.error(`[${reference}] unexpected error in form action`, error);
  return {
    status: "error",
    message: `Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos; si se repite, escríbenos con el código ${reference}.`,
    fieldErrors: {},
    values,
  };
}

export function fieldErrors(state: FormState, field: string): string[] | undefined {
  return state.status === "error" ? state.fieldErrors[field] : undefined;
}

export function fieldValue(state: FormState, field: string): string | undefined {
  return state.status === "error" ? state.values[field] : undefined;
}
