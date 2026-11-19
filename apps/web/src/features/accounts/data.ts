import "server-only";
import type { OrganizationId, OrganizationRole, SeatUsage } from "@licitaciones/core/accounts";
import { unwrap } from "@licitaciones/infra";
import { getDb } from "@/lib/session";

export interface TeamMember {
  userId: string;
  email: string;
  role: OrganizationRole;
  invitedAt: Date;
  joinedAt: Date | null;
}

/** RLS limits the result to organizations the caller belongs to (or all, for staff). */
export async function listTeamMembers(organizationId: OrganizationId): Promise<TeamMember[]> {
  const db = await getDb();
  const rows = unwrap(
    "memberships.list",
    await db
      .from("memberships")
      .select("user_id, email, role, invited_at, joined_at")
      .eq("organization_id", organizationId)
      .order("invited_at"),
  );
  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role as OrganizationRole,
    invitedAt: new Date(row.invited_at),
    joinedAt: row.joined_at ? new Date(row.joined_at) : null,
  }));
}

export async function getSeatUsage(organizationId: OrganizationId): Promise<SeatUsage | null> {
  const db = await getDb();
  const rows = unwrap("seat_usage", await db.rpc("seat_usage", { org: organizationId }));
  const usage = rows[0];
  return usage ? { maxSeats: usage.max_seats, used: usage.used } : null;
}

export async function listPlans(): Promise<
  { code: string; name: string; defaultMaxSeats: number }[]
> {
  const db = await getDb();
  const rows = unwrap(
    "plans.list",
    await db.from("plans").select("code, name, default_max_seats").order("default_max_seats"),
  );
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    defaultMaxSeats: row.default_max_seats,
  }));
}

export async function getPlanName(code: string): Promise<string> {
  const plans = await listPlans();
  return plans.find((plan) => plan.code === code)?.name ?? code;
}
