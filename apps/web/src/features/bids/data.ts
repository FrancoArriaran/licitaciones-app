import "server-only";
import type { OrganizationId } from "@licitaciones/core/accounts";
import {
  isOpenStatus,
  type BidEventType,
  type BidId,
  type BidStatus,
  type LostReason,
} from "@licitaciones/core/bids";
import { unwrap } from "@licitaciones/infra";
import { getDb } from "@/lib/session";

/** Reads for Mis postulaciones. RLS scopes everything to the viewer's organization. */

export interface BidTender {
  ocid: string;
  /** SEACE process code. */
  title: string | null;
  description: string | null;
  buyerName: string | null;
  department: string | null;
  amount: number | null;
  currency: string | null;
  enquiryEnd: string | null;
  tenderEnd: string | null;
}

export interface BidSummary {
  id: BidId;
  status: BidStatus;
  offeredAmount: number | null;
  awardedAmount: number | null;
  lostReason: LostReason | null;
  assigneeId: string | null;
  assigneeEmail: string | null;
  updatedAt: string;
  tender: BidTender;
  /** SEACE published the award and the company hasn't recorded the result yet. */
  resultDetected: boolean;
}

/** What SEACE says happened, waiting for the company to confirm. */
export interface DetectedResult {
  outcome: "won" | "lost" | "awarded_to_other";
  winnerName: string | null;
  amount: number | null;
  awardDate: string | null;
}

export interface BidEvent {
  id: number;
  type: BidEventType;
  data: Record<string, unknown>;
  actorEmail: string | null;
  createdAt: string;
}

export interface BidDocumentView {
  id: string;
  name: string;
  sizeBytes: number;
  contentType: string | null;
  uploadedByEmail: string | null;
  createdAt: string;
}

export interface BidDetail extends BidSummary {
  detectedResult: DetectedResult | null;
  events: BidEvent[];
  documents: BidDocumentView[];
}

const TENDER_COLUMNS =
  "ocid, title, description, buyer_name, department, amount, currency, enquiry_end, tender_end";

interface TenderRow {
  ocid: string;
  title: string | null;
  description: string | null;
  buyer_name: string | null;
  department: string | null;
  amount: number | null;
  currency: string | null;
  enquiry_end: string | null;
  tender_end: string | null;
}

function toTender(row: TenderRow): BidTender {
  return {
    ocid: row.ocid,
    title: row.title,
    description: row.description,
    buyerName: row.buyer_name,
    department: row.department,
    amount: row.amount,
    currency: row.currency,
    enquiryEnd: row.enquiry_end,
    tenderEnd: row.tender_end,
  };
}

/** user id → email, to show who did what. */
async function teamEmails(organizationId: OrganizationId): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = unwrap(
    "memberships.emails",
    await db.from("memberships").select("user_id, email").eq("organization_id", organizationId),
  );
  return new Map(rows.map((row) => [row.user_id, row.email]));
}

export async function listBids(organizationId: OrganizationId): Promise<BidSummary[]> {
  const db = await getDb();
  const [result, emails] = await Promise.all([
    db
      .from("bids")
      .select(
        `id, status, offered_amount, awarded_amount, lost_reason, assignee_id, updated_at, tender:tenders(${TENDER_COLUMNS}), detected:bid_events(id)`,
      )
      .eq("organization_id", organizationId)
      .eq("detected.type", "result_detected")
      .order("updated_at", { ascending: false })
      .limit(500),
    teamEmails(organizationId),
  ]);
  return unwrap("bids.list", result).map((row) => ({
    id: row.id as BidId,
    status: row.status as BidStatus,
    offeredAmount: row.offered_amount,
    awardedAmount: row.awarded_amount,
    lostReason: row.lost_reason as LostReason | null,
    assigneeId: row.assignee_id,
    assigneeEmail: row.assignee_id ? (emails.get(row.assignee_id) ?? null) : null,
    updatedAt: row.updated_at,
    tender: toTender(row.tender),
    resultDetected: isOpenStatus(row.status as BidStatus) && row.detected.length > 0,
  }));
}

function toDetectedResult(data: Record<string, unknown>): DetectedResult | null {
  const outcome = data.outcome;
  if (outcome !== "won" && outcome !== "lost" && outcome !== "awarded_to_other") return null;
  return {
    outcome,
    winnerName: typeof data.winnerName === "string" ? data.winnerName : null,
    amount: typeof data.amount === "number" ? data.amount : null,
    awardDate: typeof data.awardDate === "string" ? data.awardDate : null,
  };
}

export async function getBid(
  organizationId: OrganizationId,
  bidId: string,
): Promise<BidDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(bidId)) return null;
  const db = await getDb();
  const [result, emails] = await Promise.all([
    db
      .from("bids")
      .select(
        `id, status, offered_amount, awarded_amount, lost_reason, assignee_id, updated_at,
         tender:tenders(${TENDER_COLUMNS}),
         bid_events(id, type, data, actor_id, created_at),
         bid_documents(id, name, size_bytes, content_type, uploaded_by, created_at)`,
      )
      .eq("organization_id", organizationId)
      .eq("id", bidId)
      .maybeSingle(),
    teamEmails(organizationId),
  ]);
  const row = unwrap("bids.get", result);
  if (!row) return null;
  const email = (userId: string | null) => (userId ? (emails.get(userId) ?? null) : null);
  const events = [...row.bid_events]
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .map((event) => ({
      id: event.id,
      type: event.type as BidEventType,
      data: event.data as Record<string, unknown>,
      actorEmail: email(event.actor_id),
      createdAt: event.created_at,
    }));
  const status = row.status as BidStatus;
  const detected = events.find((event) => event.type === "result_detected");
  const detectedResult = detected && isOpenStatus(status) ? toDetectedResult(detected.data) : null;

  return {
    id: row.id as BidId,
    status: row.status as BidStatus,
    offeredAmount: row.offered_amount,
    awardedAmount: row.awarded_amount,
    lostReason: row.lost_reason as LostReason | null,
    assigneeId: row.assignee_id,
    assigneeEmail: email(row.assignee_id),
    updatedAt: row.updated_at,
    tender: toTender(row.tender),
    resultDetected: detectedResult !== null,
    detectedResult,
    events,
    documents: [...row.bid_documents]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((document) => ({
        id: document.id,
        name: document.name,
        sizeBytes: document.size_bytes,
        contentType: document.content_type,
        uploadedByEmail: email(document.uploaded_by),
        createdAt: document.created_at,
      })),
  };
}

/** The bid for an opportunity, if the company already follows it. */
export async function findBidForTender(
  organizationId: OrganizationId,
  ocid: string,
): Promise<{ id: BidId; status: BidStatus } | null> {
  const db = await getDb();
  const row = unwrap(
    "bids.forTender",
    await db
      .from("bids")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("ocid", ocid)
      .maybeSingle(),
  );
  return row ? { id: row.id as BidId, status: row.status as BidStatus } : null;
}
