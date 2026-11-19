"use server";

import { DomainError, parseInput } from "@licitaciones/core/shared";
import { redirect } from "next/navigation";
import { accountsUseCases } from "@/lib/composition";
import { formValues, toFormError, type FormState } from "@/lib/form-state";
import { safeNextPath } from "@/lib/safe-redirect";
import { getDb, requireUser } from "@/lib/session";
import { newPasswordSchema, requestResetSchema, signInSchema } from "./schemas";

class InvalidCredentialsError extends DomainError {
  readonly code = "invalid_credentials";
  constructor() {
    // Same message for unknown email and wrong password: don't reveal which accounts exist.
    super("El correo o la contraseña no son correctos.");
  }
}

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  try {
    const credentials = parseInput(signInSchema, Object.fromEntries(formData));
    const db = await getDb();
    const { error } = await db.auth.signInWithPassword(credentials);
    if (error) throw new InvalidCredentialsError();
  } catch (error) {
    return toFormError(error, formValues(formData, ["password"]));
  }
  redirect(safeNextPath(formData.get("next"), "/inicio"));
}

export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { email } = parseInput(requestResetSchema, Object.fromEntries(formData));
    const db = await getDb();
    const { error } = await db.auth.resetPasswordForEmail(email);
    if (error) console.error("resetPasswordForEmail failed", error.message);
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
  return {
    status: "success",
    message:
      "Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.",
  };
}

export async function setPassword(
  intent: "welcome" | "recovery",
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const { password } = parseInput(newPasswordSchema, Object.fromEntries(formData));
    const db = await getDb();
    const { error } = await db.auth.updateUser({ password });
    if (error) throw new Error(`updateUser failed: ${error.message}`);
    if (intent === "welcome") {
      const { acceptInvitations } = await accountsUseCases();
      await acceptInvitations.execute(user.id);
    }
  } catch (error) {
    return toFormError(error);
  }
  redirect("/inicio");
}
