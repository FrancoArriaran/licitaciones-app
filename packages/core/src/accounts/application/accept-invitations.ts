import type { UserId } from "../domain/types";
import type { MembershipRepository } from "../ports";

/** Runs once the invited user has set a password: their pending memberships become active. */
export class AcceptInvitations {
  constructor(private readonly memberships: MembershipRepository) {}

  execute(userId: UserId): Promise<void> {
    return this.memberships.markJoined(userId);
  }
}
