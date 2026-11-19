import type { Ruc } from "../shared";
import type {
  NewOrganization,
  OrganizationId,
  OrganizationRole,
  SeatUsage,
  Subscription,
  UserId,
} from "./domain/types";

export interface OrganizationRepository {
  existsWithRuc(ruc: Ruc): Promise<boolean>;
  /** Creates the organization and its subscription atomically. */
  create(organization: NewOrganization): Promise<OrganizationId>;
  getSeatUsage(organizationId: OrganizationId): Promise<SeatUsage>;
  updateSubscription(
    organizationId: OrganizationId,
    subscription: Omit<Subscription, "startsAt">,
  ): Promise<void>;
}

export interface MemberRecord {
  readonly userId: UserId;
  readonly email: string;
  readonly role: OrganizationRole;
  readonly joinedAt: Date | null;
}

export interface MembershipRepository {
  addInvitedMember(member: {
    organizationId: OrganizationId;
    userId: UserId;
    email: string;
    role: OrganizationRole;
    invitedBy: UserId;
  }): Promise<void>;
  /** Marks every pending membership of the user as joined. */
  markJoined(userId: UserId): Promise<void>;
  find(organizationId: OrganizationId, userId: UserId): Promise<MemberRecord | null>;
  /** Owners who already joined (pending invitations don't count). */
  countActiveOwners(organizationId: OrganizationId): Promise<number>;
  remove(organizationId: OrganizationId, userId: UserId): Promise<void>;
}

/** A one-time link that signs the person in and takes them to create their password. */
export type InvitationLink = string;

export interface UserDirectory {
  /**
   * Creates the auth user and returns their invitation link. Delivery (copying it,
   * WhatsApp, email) is up to the caller.
   * Throws EmailAlreadyRegisteredError when the email already has an account.
   */
  invite(email: string): Promise<{ userId: UserId; invitationLink: InvitationLink }>;
  /** A fresh link for an existing person whose invitation expired. */
  createAccessLink(email: string): Promise<InvitationLink>;
  /** Deletes a user created by invite(); used to undo an invitation that couldn't be completed. */
  remove(userId: UserId): Promise<void>;
}
