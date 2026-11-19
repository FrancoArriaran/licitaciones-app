import type {
  MemberRecord,
  MembershipRepository,
  OrganizationId,
  OrganizationRole,
  UserId,
} from "@licitaciones/core/accounts";
import { unwrap, type DbClient } from "../supabase/client";

/** Runs with the signed-in user's client: the memberships policies decide who may do what. */
export class SupabaseMembershipRepository implements MembershipRepository {
  constructor(private readonly db: DbClient) {}

  async addInvitedMember(member: Parameters<MembershipRepository["addInvitedMember"]>[0]) {
    unwrap(
      "memberships.insert",
      await this.db.from("memberships").insert({
        organization_id: member.organizationId,
        user_id: member.userId,
        email: member.email,
        role: member.role,
        invited_by: member.invitedBy,
      }),
    );
  }

  async markJoined(_userId: UserId): Promise<void> {
    // The RPC acts on auth.uid(), so it can only ever update the caller's own rows.
    unwrap("accept_pending_memberships", await this.db.rpc("accept_pending_memberships"));
  }

  async find(organizationId: OrganizationId, userId: UserId): Promise<MemberRecord | null> {
    const row = unwrap(
      "memberships.find",
      await this.db
        .from("memberships")
        .select("user_id, email, role, joined_at")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle(),
    );
    if (!row) return null;
    return {
      userId: row.user_id as UserId,
      email: row.email,
      role: row.role as OrganizationRole,
      joinedAt: row.joined_at ? new Date(row.joined_at) : null,
    };
  }

  async countActiveOwners(organizationId: OrganizationId): Promise<number> {
    const result = await this.db
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .not("joined_at", "is", null);
    unwrap("memberships.countActiveOwners", result);
    return result.count ?? 0;
  }

  async remove(organizationId: OrganizationId, userId: UserId): Promise<void> {
    const result = await this.db
      .from("memberships")
      .delete({ count: "exact" })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    unwrap("memberships.remove", result);
    // RLS filters instead of raising; zero rows means the caller wasn't allowed.
    if (result.count === 0) throw new Error("memberships.remove affected no rows");
  }
}
