"use server";

import type { OrganizationId, UserId } from "@licitaciones/core/accounts";
import { parseInput } from "@licitaciones/core/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accountsUseCases } from "@/lib/composition";
import { formValues, toFormError, type FormState } from "@/lib/form-state";
import { getActor, requireMembership } from "@/lib/session";

/**
 * Team actions come in two flavors: customers act on their own organization (taken
 * from the session, never from the form) and our staff act on a bound organization id.
 * The use cases and RLS authorize both.
 */

type Scope = { organizationId: OrganizationId; path: string };

async function ownScope(): Promise<Scope> {
  const { organization } = await requireMembership();
  return { organizationId: organization.id, path: "/empresa" };
}

function staffScope(organizationId: OrganizationId): Scope {
  return { organizationId, path: `/admin/empresas/${organizationId}` };
}

const memberSchema = z.object({ userId: z.uuid("Usuario no válido.") });

function invitationLinkState(email: string, invitationLink: string): FormState {
  return {
    status: "success",
    message: `Invitación lista para ${email}.`,
    invitationLink,
  };
}

async function invite(scope: Scope, formData: FormData): Promise<FormState> {
  const actor = await getActor(scope.organizationId);
  const { inviteMember } = await accountsUseCases();
  const result = await inviteMember.execute(actor, scope.organizationId, {
    email: formData.get("email"),
    role: formData.get("role"),
  });
  revalidatePath(scope.path);
  return invitationLinkState(result.email, result.invitationLink);
}

async function renew(scope: Scope, formData: FormData): Promise<FormState> {
  const { userId } = parseInput(memberSchema, Object.fromEntries(formData));
  const actor = await getActor(scope.organizationId);
  const { renewInvitationLink } = await accountsUseCases();
  const result = await renewInvitationLink.execute(actor, scope.organizationId, userId as UserId);
  return invitationLinkState(result.email, result.invitationLink);
}

async function remove(scope: Scope, formData: FormData): Promise<FormState> {
  const { userId } = parseInput(memberSchema, Object.fromEntries(formData));
  const actor = await getActor(scope.organizationId);
  const { removeMember } = await accountsUseCases();
  await removeMember.execute(actor, scope.organizationId, userId as UserId);
  revalidatePath(scope.path);
  return { status: "success", message: "Listo, esa persona ya no tiene acceso a la empresa." };
}

export async function inviteTeamMember(_previous: FormState, formData: FormData) {
  try {
    return await invite(await ownScope(), formData);
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}

export async function inviteMemberAsStaff(
  organizationId: OrganizationId,
  _previous: FormState,
  formData: FormData,
) {
  try {
    return await invite(staffScope(organizationId), formData);
  } catch (error) {
    return toFormError(error, formValues(formData));
  }
}

export async function renewTeamInvitation(_previous: FormState, formData: FormData) {
  try {
    return await renew(await ownScope(), formData);
  } catch (error) {
    return toFormError(error);
  }
}

export async function renewInvitationAsStaff(
  organizationId: OrganizationId,
  _previous: FormState,
  formData: FormData,
) {
  try {
    return await renew(staffScope(organizationId), formData);
  } catch (error) {
    return toFormError(error);
  }
}

export async function removeTeamMember(_previous: FormState, formData: FormData) {
  try {
    return await remove(await ownScope(), formData);
  } catch (error) {
    return toFormError(error);
  }
}

export async function removeMemberAsStaff(
  organizationId: OrganizationId,
  _previous: FormState,
  formData: FormData,
) {
  try {
    return await remove(staffScope(organizationId), formData);
  } catch (error) {
    return toFormError(error);
  }
}
