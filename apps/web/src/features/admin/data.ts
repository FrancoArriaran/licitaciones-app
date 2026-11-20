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

export interface SyncRunView {
  id: number;
  period: string;
  status: string;
  tenders: number;
  documents: number;
  awards: number;
  errorMessage: string | null;
  ranAt: Date;
}

export interface IngestionHealth {
  runs: SyncRunView[];
  tenderCount: number;
  awardCount: number;
  latestPublication: Date | null;
  lastSuccessAt: Date | null;
  /** No successful run in more than STALE_AFTER_HOURS: the daily sync is failing. */
  stale: boolean;
}

/** The daily sync runs at 05:00; more than this since the last success means it's failing. */
const STALE_AFTER_HOURS = 30;

/** What the sync job left in `sync_runs`, plus how much data there is. */
export async function getIngestionHealth(): Promise<IngestionHealth> {
  const db = await getDb();
  const [runs, tenders, awards, latest] = await Promise.all([
    db
      .from("sync_runs")
      .select(
        "id, year, month, status, tenders_upserted, documents_upserted, awards_upserted, error_message, ran_at",
      )
      .order("ran_at", { ascending: false })
      .limit(40),
    db.from("tenders").select("ocid", { count: "exact", head: true }),
    db.from("awards").select("id", { count: "exact", head: true }),
    db
      .from("tenders")
      .select("date_published")
      .not("date_published", "is", null)
      .order("date_published", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  unwrap("tenders.count", tenders);
  unwrap("awards.count", awards);
  const latestRow = unwrap("tenders.latest", latest);

  const runViews = unwrap("sync_runs.list", runs).map((run) => ({
    id: run.id,
    period: `${String(run.year)}-${String(run.month).padStart(2, "0")}`,
    status: run.status,
    tenders: run.tenders_upserted,
    documents: run.documents_upserted,
    awards: run.awards_upserted,
    errorMessage: run.error_message,
    ranAt: new Date(run.ran_at),
  }));
  const lastSuccessAt = runViews.find((run) => run.status === "ok")?.ranAt ?? null;

  return {
    runs: runViews,
    lastSuccessAt,
    stale:
      lastSuccessAt === null ||
      Date.now() - lastSuccessAt.getTime() > STALE_AFTER_HOURS * 3_600_000,
    tenderCount: tenders.count ?? 0,
    awardCount: awards.count ?? 0,
    latestPublication: latestRow?.date_published ? new Date(latestRow.date_published) : null,
  };
}
