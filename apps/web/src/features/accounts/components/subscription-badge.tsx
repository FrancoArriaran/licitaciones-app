import { subscriptionAccess, type Subscription } from "@licitaciones/core/accounts";
import { formatDateLima } from "@licitaciones/core/shared";
import { Badge } from "@licitaciones/ui";

export function SubscriptionBadge({
  subscription,
  now,
}: {
  subscription: Subscription;
  now: Date;
}) {
  const access = subscriptionAccess(subscription, now);
  switch (access.kind) {
    case "active":
      return (
        <Badge tone={access.daysLeft <= 15 ? "warning" : "success"}>
          Activo hasta {formatDateLima(subscription.endsAt)}
        </Badge>
      );
    case "trial":
      return (
        <Badge tone="info">
          Prueba · {access.daysLeft} {access.daysLeft === 1 ? "día" : "días"}
        </Badge>
      );
    case "expired":
      return <Badge tone="danger">Vencido el {formatDateLima(subscription.endsAt)}</Badge>;
    case "paused":
      return <Badge tone="warning">Pausado</Badge>;
    case "cancelled":
      return <Badge>Cancelado</Badge>;
  }
}
