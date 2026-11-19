import "server-only";
import type { OrganizationId, Subscription } from "@licitaciones/core/accounts";
import { unwrap } from "@licitaciones/infra";
import { getDb, toSubscription } from "@/lib/session";

/** Staff-only reads. RLS returns everything to platform admins and nothing extra to anyone else. */

export interface OrganizationSummary {
  id: OrganizationId;
  name: string;
  ruc: string;
  createdAt: Date;
  subscription: Subscription | null;
  memberCount: number;
}

const ORGANIZATION_COLUMNS =
  "id, name, ruc, created_at, subscriptions(plan_code, status, starts_at, ends_at, max_seats), memberships(count)";

type OrganizationRow = {
  id: string;
  name: string;
  ruc: string;
  created_at: string;
  subscriptions:
    Parameters<typeof toSubscription>[0] | Parameters<typeof toSubscription>[0][] | null;
  memberships: { count: number }[];
};

function toSummary(row: OrganizationRow): OrganizationSummary {
  const subscription = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
  return {
    id: row.id as OrganizationId,
    name: row.name,
    ruc: row.ruc,
    createdAt: new Date(row.created_at),
    subscription: subscription ? toSubscription(subscription) : null,
    memberCount: row.memberships[0]?.count ?? 0,
  };
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const db = await getDb();
  const rows = unwrap(
    "organizations.list",
    await db
      .from("organizations")
      .select(ORGANIZATION_COLUMNS)
      .order("created_at", { ascending: false })
      .overrideTypes<OrganizationRow[], { merge: false }>(),
  );
  return rows.map(toSummary);
}

export async function getOrganization(id: string): Promise<OrganizationSummary | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const row = unwrap(
    "organizations.get",
    await db
      .from("organizations")
      .select(ORGANIZATION_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<OrganizationRow, { merge: false }>(),
  );
  return row ? toSummary(row) : null;
}

export interface LeadRow {
  id: string;
  createdAt: Date;
  fullName: string;
  jobTitle: string | null;
  companyName: string;
  ruc: string | null;
  email: string;
  phone: string;
  sector: string;
  sellsToGovernment: string;
  status: string;
}

export async function listLeads(): Promise<LeadRow[]> {
  const db = await getDb();
  const rows = unwrap(
    "leads.list",
    await db.from("leads").select("*").order("created_at", { ascending: false }).limit(200),
  );
  return rows.map((row) => ({
    id: row.id,
    createdAt: new Date(row.created_at),
    fullName: row.full_name,
    jobTitle: row.job_title,
    companyName: row.company_name,
    ruc: row.ruc,
    email: row.email,
    phone: row.phone,
    sector: row.sector,
    sellsToGovernment: row.sells_to_government,
    status: row.status,
  }));
}
