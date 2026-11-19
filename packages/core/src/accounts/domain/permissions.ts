import type { Actor, OrganizationRole } from "./types";

export function canCreateOrganizations(actor: Actor): boolean {
  return actor.isPlatformAdmin;
}

/** Plans, validity and seats are commercial terms: only our staff change them. */
export function canManageSubscriptions(actor: Actor): boolean {
  return actor.isPlatformAdmin;
}

/** Owners and admins manage their team; only owners (or our staff) can hand out ownership. */
export function canInviteWithRole(actor: Actor, role: OrganizationRole): boolean {
  if (actor.isPlatformAdmin) return true;
  if (role === "owner") return actor.role === "owner";
  return actor.role === "owner" || actor.role === "admin";
}

/** Remove a teammate or renew their invitation. Mirrors the memberships_delete policy. */
export function canManageMember(actor: Actor, memberRole: OrganizationRole): boolean {
  if (actor.isPlatformAdmin || actor.role === "owner") return true;
  return actor.role === "admin" && memberRole === "member";
}

/** Alert profiles and notification channels. Mirrors the alert_profiles_write policy. */
export function canManageOrganizationSettings(actor: Actor): boolean {
  return actor.isPlatformAdmin || actor.role === "owner" || actor.role === "admin";
}
