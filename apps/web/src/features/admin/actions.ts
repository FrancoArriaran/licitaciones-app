"use server";

import {
  createOrganizationSchema,
  type Actor,
  type OrganizationId,
} from "@licitaciones/core/accounts";
import { DomainError, emailSchema, parseInput } from "@licitaciones/core/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accountsUseCases, marketingUseCases } from "@/lib/composition";
import { formValues, toFormError, type FormState } from "@/lib/form-state";
import { requirePlatformAdmin } from "@/lib/session";

const newOrganizationFormSchema = createOrganizationSchema.extend({ ownerEmail: emailSchema });

async function staffActor(): Promise<Actor> {
  const user = await requirePlatformAdmin();
  return { userId: user.id, isPlatformAdmin: true, role: null };
}

/**
 * Creates the organization, then the owner's invitation link. If the invitation
 * fails the organization still exists, so we land on its page with the reason and a
 * form to retry, instead of leaving staff guessing.
 */
export async function createOrganizationWithOwner(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  let organizationId: OrganizationId;
  try {
    const input = Object.fromEntries(formData);
    const { ownerEmail } = parseInput(newOrganizationFormSchema, input);
    const actor = await staffActor();
    const { createOrganization, inviteMember } = await accountsUseCases();

    organizationId = await createOrganization.execute(actor, input);
    revalidatePath("/admin/empresas");

    try {
      const invitation = await inviteMember.execute(actor, organizationId, {
        email: ownerEmail,
        role: "owner",
      });
      return {
        status: "success",
        message: `Empresa creada. Invitación lista para ${invitation.email}.`,
        invitationLink: invitation.invitationLink,
        href: `/admin/empresas/${organizationId}`,
      };
    } catch (error) {
      if (!(error instanceof DomainError)) console.error("owner invitation failed", error);
      const reason = error instanceof DomainError ? error.code : "unexpected";
      redirect(`/admin/empresas/${organizationId}?invitacion=${reason}`);
    }
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}

export async function updateSubscriptionAsStaff(
  organizationId: OrganizationId,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await staffActor();
    const { updateSubscription } = await accountsUseCases();
    await updateSubscription.execute(actor, organizationId, Object.fromEntries(formData));
    revalidatePath(`/admin/empresas/${organizationId}`);
    revalidatePath("/admin/empresas");
    return { status: "success", message: "Plan actualizado." };
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}

export async function updateLeadStatus(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await staffActor();
    const { updateLeadStatus: useCase } = await marketingUseCases();
    await useCase.execute(actor, Object.fromEntries(formData));
    revalidatePath("/admin/leads");
    return { status: "success", message: "Estado actualizado." };
  } catch (error) {
    return toFormError(error);
  }
}
