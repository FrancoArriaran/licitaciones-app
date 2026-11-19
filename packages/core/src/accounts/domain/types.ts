import type { Brand, Ruc } from "../../shared";

export type OrganizationId = Brand<string, "OrganizationId">;
export type UserId = Brand<string, "UserId">;

export const PLAN_CODES = ["essential", "professional", "enterprise"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const ORGANIZATION_ROLES = ["owner", "admin", "member"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const SUBSCRIPTION_STATUSES = ["trial", "active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface Subscription {
  readonly planCode: PlanCode;
  readonly status: SubscriptionStatus;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly maxSeats: number;
}

export interface NewOrganization {
  readonly name: string;
  readonly ruc: Ruc;
  readonly subscription: Subscription;
  readonly createdBy: UserId;
}

/** Who is performing an action, resolved from the session by the app layer. */
export interface Actor {
  readonly userId: UserId;
  readonly isPlatformAdmin: boolean;
  /** Role in the organization the action targets, if the actor belongs to it. */
  readonly role: OrganizationRole | null;
}

export interface SeatUsage {
  readonly maxSeats: number;
  /** Joined members plus pending invitations. */
  readonly used: number;
}
