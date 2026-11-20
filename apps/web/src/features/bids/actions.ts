"use server";

import type { BidId, DocumentUpload } from "@licitaciones/core/bids";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bidsUseCases } from "@/lib/composition";
import { formValues, toFormError, type FormState } from "@/lib/form-state";
import { getActor, requireMembership } from "@/lib/session";

type Outcome<T = object> = ({ ok: true } & T) | { ok: false; message: string };

function failure(error: unknown): { ok: false; message: string } {
  const state = toFormError(error);
  return { ok: false, message: state.status === "error" ? state.message : "No se pudo completar." };
}

/** Every action works on the caller's organization, taken from the session. */
async function context() {
  const { organization } = await requireMembership();
  const actor = await getActor(organization.id);
  return { organizationId: organization.id, actor, useCases: await bidsUseCases() };
}

function refresh(bidId?: string) {
  revalidatePath("/postulaciones");
  if (bidId) revalidatePath(`/postulaciones/${bidId}`);
  revalidatePath("/inicio");
}

/** "Seguir esta licitación" from the opportunity page. */
export async function followOpportunity(ocid: string): Promise<Outcome<{ bidId: string }>> {
  try {
    const { actor, organizationId, useCases } = await context();
    const { bidId } = await useCases.followOpportunity.execute(actor, organizationId, { ocid });
    refresh(bidId);
    revalidatePath(`/oportunidades/${ocid}`);
    return { ok: true, bidId };
  } catch (error) {
    return failure(error);
  }
}

export async function updateBid(
  bidId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { actor, organizationId, useCases } = await context();
    const { changed } = await useCases.updateBid.execute(actor, organizationId, bidId as BidId, {
      status: formData.get("status"),
      offeredAmount: formData.get("offeredAmount"),
      awardedAmount: formData.get("awardedAmount"),
      lostReason: formData.get("lostReason"),
      assigneeId: formData.get("assigneeId"),
    });
    refresh(bidId);
    return { status: "success", message: changed ? "Guardado." : "No había cambios que guardar." };
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}

/** Quick status change from the board, without opening the bid. */
export async function moveBid(
  bidId: string,
  details: {
    status: string;
    offeredAmount: number | null;
    awardedAmount: number | null;
    lostReason: string | null;
    assigneeId: string | null;
  },
): Promise<Outcome> {
  try {
    const { actor, organizationId, useCases } = await context();
    await useCases.updateBid.execute(actor, organizationId, bidId as BidId, {
      ...details,
      offeredAmount: details.offeredAmount === null ? "" : String(details.offeredAmount),
      awardedAmount: details.awardedAmount === null ? "" : String(details.awardedAmount),
    });
    refresh(bidId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function addBidNote(
  bidId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { actor, organizationId, useCases } = await context();
    await useCases.addNote.execute(actor, organizationId, bidId as BidId, {
      text: formData.get("text"),
    });
    refresh(bidId);
    return { status: "success", message: "Nota agregada." };
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}

/** Imports every process where the company's RUC bid or won in SEACE. */
export async function importSeaceHistory(): Promise<Outcome<{ imported: number }>> {
  try {
    const { actor, organizationId, useCases } = await context();
    const { imported } = await useCases.importHistory.execute(actor, organizationId);
    refresh();
    return { ok: true, imported };
  } catch (error) {
    return failure(error);
  }
}

export async function removeBid(bidId: string): Promise<Outcome> {
  try {
    const { actor, organizationId, useCases } = await context();
    await useCases.removeBid.execute(actor, organizationId, bidId as BidId);
    refresh();
  } catch (error) {
    return failure(error);
  }
  redirect("/postulaciones?eliminada=1");
}

export async function prepareDocumentUpload(
  bidId: string,
  file: DocumentUpload,
): Promise<Outcome<{ path: string; token: string }>> {
  try {
    const { actor, organizationId, useCases } = await context();
    const { path, token } = await useCases.documents.prepare(
      actor,
      organizationId,
      bidId as BidId,
      file,
    );
    return { ok: true, path, token };
  } catch (error) {
    return failure(error);
  }
}

export async function registerDocument(
  bidId: string,
  file: DocumentUpload & { path: string },
): Promise<Outcome> {
  try {
    const { actor, organizationId, useCases } = await context();
    await useCases.documents.register(actor, organizationId, bidId as BidId, file);
    refresh(bidId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function documentDownloadUrl(documentId: string): Promise<Outcome<{ url: string }>> {
  try {
    const { actor, organizationId, useCases } = await context();
    return {
      ok: true,
      url: await useCases.documents.downloadUrl(actor, organizationId, documentId),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function removeDocument(bidId: string, documentId: string): Promise<Outcome> {
  try {
    const { actor, organizationId, useCases } = await context();
    await useCases.documents.remove(actor, organizationId, documentId);
    refresh(bidId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
