"use server";

import { headers } from "next/headers";
import { marketingUseCases } from "@/lib/composition";
import { formValues, toFormError, type FormState } from "@/lib/form-state";

export async function submitDemoRequest(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await (
      await marketingUseCases()
    ).submitDemoRequest.execute(Object.fromEntries(formData), { ip });
    return {
      status: "success",
      message:
        "Recibimos tu solicitud. Te escribiremos por WhatsApp o correo en menos de un día hábil para coordinar la demo.",
    };
  } catch (error) {
    return toFormError(error, formValues(formData, ["captchaToken"]));
  }
}
