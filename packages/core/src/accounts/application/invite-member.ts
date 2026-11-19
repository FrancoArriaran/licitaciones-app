import { z } from "zod";
import { emailSchema, NotAuthorizedError, parseInput, type UntrustedInput } from "../../shared";
import { SeatLimitReachedError } from "../domain/errors";
import { canInviteWithRole } from "../domain/permissions";
import { ORGANIZATION_ROLES, type Actor, type OrganizationId } from "../domain/types";
import type {
  InvitationLink,
  MembershipRepository,
  OrganizationRepository,
  UserDirectory,
} from "../ports";

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(ORGANIZATION_ROLES, "Elige un rol."),
});

export type InviteMemberInput = z.input<typeof inviteMemberSchema>;

export class InviteMember {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    input: UntrustedInput<InviteMemberInput>,
  ): Promise<{ email: string; invitationLink: InvitationLink }> {
    const data = parseInput(inviteMemberSchema, input);
    if (!canInviteWithRole(actor, data.role)) throw new NotAuthorizedError();

    const seats = await this.organizations.getSeatUsage(organizationId);
    if (seats.used >= seats.maxSeats) throw new SeatLimitReachedError(seats.maxSeats);

    const { userId, invitationLink } = await this.users.invite(data.email);
    try {
      await this.memberships.addInvitedMember({
        organizationId,
        userId,
        email: data.email,
        role: data.role,
        invitedBy: actor.userId,
      });
    } catch (error) {
      // Without a membership the new account would be orphaned and its email unusable.
      await this.users.remove(userId);
      throw error;
    }
    return { email: data.email, invitationLink };
  }
}
