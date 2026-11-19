"use server";

import type { CatalogFamily } from "@licitaciones/core/alerts";
import { isDepartmentCode } from "@licitaciones/core/alerts";
import { DomainError, parseInput } from "@licitaciones/core/shared";
import { unwrap } from "@licitaciones/infra";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alertsUseCases } from "@/lib/composition";
import { formValues, toFormError, type FormState } from "@/lib/form-state";
import { getActor, getDb, requireMembership } from "@/lib/session";
import type { Opportunity } from "./types";

type Outcome<T> = ({ ok: true } & T) | { ok: false; message: string };

function failure(error: unknown): { ok: false; message: string } {
  const state = toFormError(error);
  return { ok: false, message: state.status === "error" ? state.message : "No se pudo completar." };
}

export async function suggestCategories(
  description: string,
): Promise<Outcome<{ families: CatalogFamily[]; reasoning: string }>> {
  try {
    const { organization } = await requireMembership();
    const actor = await getActor(organization.id);
    const { suggestCategories: useCase } = await alertsUseCases();
    return { ok: true, ...(await useCase.execute(actor, { description })) };
  } catch (error) {
    if (!(error instanceof DomainError)) {
      return {
        ok: false,
        message:
          "No pudimos sugerir categorías en este momento. Búscalas en la lista o inténtalo en un minuto.",
      };
    }
    return failure(error);
  }
}

const previewSchema = z.object({
  families: z
    .array(z.string().regex(/^\d{4}$/))
    .min(1, "Elige al menos una categoría.")
    .max(10),
  departments: z.array(z.string().refine(isDepartmentCode)),
  minAmount: z.number().min(0).nullable(),
  maxAmount: z.number().min(0).nullable(),
});

/** "Esto te habría llegado en los últimos 30 días", from real SEACE data. */
export async function previewAlertProfile(
  input: z.input<typeof previewSchema>,
): Promise<Outcome<{ opportunities: Opportunity[] }>> {
  try {
    await requireMembership();
    const data = parseInput(previewSchema, input);
    const db = await getDb();
    const rows = unwrap(
      "preview_alert_profile",
      await db.rpc("preview_alert_profile", {
        p_families: data.families,
        p_departments: data.departments,
        // PostgREST accepts null for these numeric args; the generated types say number.
        p_min_amount: data.minAmount as number,
        p_max_amount: data.maxAmount as number,
      }),
    );
    return {
      ok: true,
      opportunities: rows.map((row) => ({
        ocid: row.ocid,
        title: row.title,
        description: row.description,
        buyerName: row.buyer_name,
        department: row.department,
        amount: row.amount,
        currency: row.currency,
        datePublished: row.date_published,
        enquiryEnd: row.enquiry_end,
        category: row.unspsc_description,
        profileName: null,
      })),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function saveAlertProfile(
  profileId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { organization } = await requireMembership();
    const actor = await getActor(organization.id);
    const { saveAlertProfile: useCase } = await alertsUseCases();
    await useCase.execute(
      actor,
      organization.id,
      {
        name: formData.get("name"),
        businessDescription: formData.get("businessDescription"),
        families: formData.getAll("families"),
        departments: formData.getAll("departments"),
        minAmount: formData.get("minAmount"),
        maxAmount: formData.get("maxAmount"),
        status: formData.get("status"),
      },
      profileId ?? undefined,
    );
    revalidatePath("/alertas");
    revalidatePath("/inicio");
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
  redirect("/alertas?guardado=1");
}

export async function saveNotificationSettings(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { organization } = await requireMembership();
    const actor = await getActor(organization.id);
    const { saveNotificationSettings: useCase } = await alertsUseCases();
    await useCase.execute(actor, organization.id, Object.fromEntries(formData));
    revalidatePath("/alertas");
    return { status: "success", message: "Guardamos tus preferencias de aviso." };
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}
