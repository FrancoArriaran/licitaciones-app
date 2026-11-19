import { NotAuthorizedError, NotFoundError } from "../../shared";
import { LastOwnerError, MemberAlreadyJoinedError } from "../domain/errors";
import { canManageMember } from "../domain/permissions";
import type { Actor, OrganizationId, UserId } from "../domain/types";
import type { InvitationLink, MemberRecord, MembershipRepository, UserDirectory } from "../ports";

async function findManageableMember(
  memberships: MembershipRepository,
  actor: Actor,
  organizationId: OrganizationId,
  userId: UserId,
): Promise<MemberRecord> {
  const member = await memberships.find(organizationId, userId);
  if (!member) throw new NotFoundError("No encontramos a esa persona en la empresa.");
  if (!canManageMember(actor, member.role)) throw new NotAuthorizedError();
  return member;
}

/** Invitation links expire after 24 hours; this issues a fresh one for a pending member. */
export class RenewInvitationLink {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<{ email: string; invitationLink: InvitationLink }> {
    const member = await findManageableMember(this.memberships, actor, organizationId, userId);
    if (member.joinedAt) throw new MemberAlreadyJoinedError();
    return { email: member.email, invitationLink: await this.users.createAccessLink(member.email) };
  }
}

/**
 * Takes someone out of the organization, keeping at least one active owner (a pending
 * owner invitation can always be cancelled, e.g. to re-invite the right email). A pending invitee's account is deleted too,
 * so the email is free to be invited again; a joined user keeps their login but no
 * longer sees the organization.
 */
export class RemoveMember {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(actor: Actor, organizationId: OrganizationId, userId: UserId): Promise<void> {
    const member = await findManageableMember(this.memberships, actor, organizationId, userId);
    const isActiveOwner = member.role === "owner" && member.joinedAt !== null;
    if (isActiveOwner && (await this.memberships.countActiveOwners(organizationId)) <= 1) {
      throw new LastOwnerError();
    }

    await this.memberships.remove(organizationId, userId);
    if (!member.joinedAt) await this.users.remove(userId);
  }
}
