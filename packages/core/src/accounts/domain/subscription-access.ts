import type { Subscription } from "./types";

export type SubscriptionAccess =
  | { readonly kind: "active" | "trial"; readonly daysLeft: number }
  | { readonly kind: "expired" | "paused" | "cancelled" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether the organization can use the product right now. Mirrors has_active_subscription() in SQL. */
export function subscriptionAccess(subscription: Subscription, now: Date): SubscriptionAccess {
  if (subscription.status === "paused" || subscription.status === "cancelled") {
    return { kind: subscription.status };
  }
  if (now < subscription.startsAt || now >= subscription.endsAt) {
    return { kind: "expired" };
  }
  const daysLeft = Math.ceil((subscription.endsAt.getTime() - now.getTime()) / DAY_MS);
  return { kind: subscription.status, daysLeft };
}

export function hasProductAccess(subscription: Subscription, now: Date): boolean {
  const { kind } = subscriptionAccess(subscription, now);
  return kind === "active" || kind === "trial";
}
