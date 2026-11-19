import type {
  NewOrganization,
  OrganizationId,
  OrganizationRepository,
  SeatUsage,
} from "@licitaciones/core/accounts";
import { NotFoundError, type Ruc } from "@licitaciones/core/shared";
import { unwrap, type DbClient } from "../supabase/client";

/** Runs with the signed-in user's client: RLS decides what they may read and write. */
export class SupabaseOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: DbClient) {}

  async existsWithRuc(ruc: Ruc): Promise<boolean> {
    const result = await this.db
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("ruc", ruc);
    if (result.error) unwrap("organizations.existsWithRuc", result);
    return (result.count ?? 0) > 0;
  }

  async create(organization: NewOrganization): Promise<OrganizationId> {
    const { subscription } = organization;
    const id = unwrap(
      "create_organization",
      await this.db.rpc("create_organization", {
        p_name: organization.name,
        p_ruc: organization.ruc,
        p_plan_code: subscription.planCode,
        p_status: subscription.status,
        p_starts_at: subscription.startsAt.toISOString(),
        p_ends_at: subscription.endsAt.toISOString(),
        p_max_seats: subscription.maxSeats,
      }),
    );
    return id as OrganizationId;
  }

  async getSeatUsage(organizationId: OrganizationId): Promise<SeatUsage> {
    const rows = unwrap("seat_usage", await this.db.rpc("seat_usage", { org: organizationId }));
    const usage = rows[0];
    if (!usage) throw new NotFoundError("No encontramos esa empresa.");
    return { maxSeats: usage.max_seats, used: usage.used };
  }

  async updateSubscription(
    organizationId: OrganizationId,
    subscription: Parameters<OrganizationRepository["updateSubscription"]>[1],
  ): Promise<void> {
    const result = await this.db
      .from("subscriptions")
      .update(
        {
          plan_code: subscription.planCode,
          status: subscription.status,
          ends_at: subscription.endsAt.toISOString(),
          max_seats: subscription.maxSeats,
        },
        { count: "exact" },
      )
      .eq("organization_id", organizationId);
    unwrap("subscriptions.update", result);
    // RLS filters instead of raising; zero rows means not allowed or not found.
    if (result.count === 0)
      throw new NotFoundError("No encontramos la suscripción de esa empresa.");
  }
}
