import "server-only";
import type {
  Actor,
  OrganizationId,
  OrganizationRole,
  Subscription,
  UserId,
} from "@licitaciones/core/accounts";
import { unwrap } from "@licitaciones/infra";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createUserClient } from "./supabase/server";

/**
 * Data access layer for identity (see Next.js authentication guide). Every page,
 * action and route that needs the user goes through these functions; never trust
 * an organization id coming from the browser.
 */

export const getDb = cache(createUserClient);

export interface CurrentUser {
  id: UserId;
  email: string;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const db = await getDb();
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub as UserId, email: typeof claims.email === "string" ? claims.email : "" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const db = await getDb();
  return unwrap("is_platform_admin", await db.rpc("is_platform_admin"));
});

export interface MembershipContext {
  role: OrganizationRole;
  organization: { id: OrganizationId; name: string; ruc: string };
  subscription: Subscription;
}

export const getMembership = cache(async (): Promise<MembershipContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getDb();

  const membership = unwrap(
    "memberships.current",
    await db
      .from("memberships")
      .select("role, organization:organizations(id, name, ruc)")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  if (!membership?.organization) return null;

  const subscription = unwrap(
    "subscriptions.current",
    await db
      .from("subscriptions")
      .select("plan_code, status, starts_at, ends_at, max_seats")
      .eq("organization_id", membership.organization.id)
      .single(),
  );

  return {
    role: membership.role as OrganizationRole,
    organization: {
      id: membership.organization.id as OrganizationId,
      name: membership.organization.name,
      ruc: membership.organization.ruc,
    },
    subscription: toSubscription(subscription),
  };
});

export async function requireMembership(): Promise<MembershipContext> {
  await requireUser();
  const membership = await getMembership();
  if (!membership) redirect((await isPlatformAdmin()) ? "/admin" : "/sin-empresa");
  return membership;
}

export async function requirePlatformAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(await isPlatformAdmin())) redirect("/inicio");
  return user;
}

/** The Actor the core use cases authorize against, scoped to one organization. */
export async function getActor(organizationId: OrganizationId): Promise<Actor> {
  const user = await requireUser();
  const [admin, membership] = await Promise.all([isPlatformAdmin(), getMembership()]);
  return {
    userId: user.id,
    isPlatformAdmin: admin,
    role: membership?.organization.id === organizationId ? membership.role : null,
  };
}

export function toSubscription(row: {
  plan_code: string;
  status: string;
  starts_at: string;
  ends_at: string;
  max_seats: number;
}): Subscription {
  return {
    planCode: row.plan_code as Subscription["planCode"],
    status: row.status as Subscription["status"],
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    maxSeats: row.max_seats,
  };
}
