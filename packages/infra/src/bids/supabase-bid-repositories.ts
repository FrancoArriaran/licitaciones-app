import type { OrganizationId, UserId } from "@licitaciones/core/accounts";
import {
  TenderNotFoundError,
  type Bid,
  type BidDetails,
  type BidDocumentRepository,
  type BidId,
  type BidRepository,
  type BidSource,
  type BidStatus,
  type BidTimeline,
  type LostReason,
  type NewBidEvent,
  type TeamDirectory,
} from "@licitaciones/core/bids";
import { unwrap, type DbClient } from "../supabase/client";

/** Runs with the user's session: RLS decides what each person can read and write. */
export class SupabaseBidRepository implements BidRepository {
  constructor(private readonly db: DbClient) {}

  async findIdByOcid(organizationId: OrganizationId, ocid: string) {
    const row = unwrap(
      "bids.findByOcid",
      await this.db
        .from("bids")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("ocid", ocid)
        .maybeSingle(),
    );
    return row ? (row.id as BidId) : null;
  }

  async create(bid: {
    organizationId: OrganizationId;
    ocid: string;
    source: BidSource;
    createdBy: UserId;
  }) {
    const result = await this.db
      .from("bids")
      .insert({
        organization_id: bid.organizationId,
        ocid: bid.ocid,
        source: bid.source,
        created_by: bid.createdBy,
      })
      .select("id")
      .single();
    // 23503: the process isn't in `tenders` (foreign key).
    if (result.error?.code === "23503") throw new TenderNotFoundError();
    return unwrap("bids.create", result).id as BidId;
  }

  async get(organizationId: OrganizationId, bidId: BidId): Promise<Bid | null> {
    const row = unwrap(
      "bids.get",
      await this.db
        .from("bids")
        .select(
          "id, organization_id, ocid, status, offered_amount, awarded_amount, lost_reason, assignee_id",
        )
        .eq("organization_id", organizationId)
        .eq("id", bidId)
        .maybeSingle(),
    );
    if (!row) return null;
    return {
      id: row.id as BidId,
      organizationId: row.organization_id as OrganizationId,
      ocid: row.ocid,
      status: row.status as BidStatus,
      offeredAmount: row.offered_amount,
      awardedAmount: row.awarded_amount,
      lostReason: row.lost_reason as LostReason | null,
      assigneeId: row.assignee_id as UserId | null,
    };
  }

  async update(organizationId: OrganizationId, bidId: BidId, details: BidDetails) {
    const rows = unwrap(
      "bids.update",
      await this.db
        .from("bids")
        .update({
          status: details.status,
          offered_amount: details.offeredAmount,
          awarded_amount: details.awardedAmount,
          lost_reason: details.lostReason,
          assignee_id: details.assigneeId,
        })
        .eq("organization_id", organizationId)
        .eq("id", bidId)
        .select("id"),
    );
    // RLS filters silently: zero rows means the subscription expired or it isn't theirs.
    if (rows.length === 0) throw new Error("bids.update affected no rows");
  }

  async remove(organizationId: OrganizationId, bidId: BidId) {
    const rows = unwrap(
      "bids.remove",
      await this.db
        .from("bids")
        .delete()
        .eq("organization_id", organizationId)
        .eq("id", bidId)
        .select("id"),
    );
    return rows.length > 0;
  }
}

export class SupabaseBidTimeline implements BidTimeline {
  constructor(private readonly db: DbClient) {}

  async append(
    organizationId: OrganizationId,
    bidId: BidId,
    actorId: UserId,
    events: readonly NewBidEvent[],
  ) {
    if (events.length === 0) return;
    unwrap(
      "bid_events.append",
      await this.db.from("bid_events").insert(
        events.map((event) => ({
          bid_id: bidId,
          organization_id: organizationId,
          type: event.type,
          data: event.data,
          actor_id: actorId,
        })),
      ),
    );
  }
}

export class SupabaseBidDocumentRepository implements BidDocumentRepository {
  constructor(private readonly db: DbClient) {}

  async add(document: {
    organizationId: OrganizationId;
    bidId: BidId;
    storagePath: string;
    name: string;
    sizeBytes: number;
    contentType: string;
    uploadedBy: UserId;
  }) {
    return unwrap(
      "bid_documents.add",
      await this.db
        .from("bid_documents")
        .insert({
          organization_id: document.organizationId,
          bid_id: document.bidId,
          storage_path: document.storagePath,
          name: document.name,
          size_bytes: document.sizeBytes,
          content_type: document.contentType,
          uploaded_by: document.uploadedBy,
        })
        .select("id")
        .single(),
    ).id;
  }

  async find(organizationId: OrganizationId, documentId: string) {
    const row = unwrap(
      "bid_documents.find",
      await this.db
        .from("bid_documents")
        .select("id, bid_id, storage_path, name")
        .eq("organization_id", organizationId)
        .eq("id", documentId)
        .maybeSingle(),
    );
    return row
      ? { id: row.id, bidId: row.bid_id as BidId, storagePath: row.storage_path, name: row.name }
      : null;
  }

  async remove(organizationId: OrganizationId, documentId: string) {
    unwrap(
      "bid_documents.remove",
      await this.db
        .from("bid_documents")
        .delete()
        .eq("organization_id", organizationId)
        .eq("id", documentId),
    );
  }
}

export class SupabaseTeamDirectory implements TeamDirectory {
  constructor(private readonly db: DbClient) {}

  async isMember(organizationId: OrganizationId, userId: UserId) {
    const row = unwrap(
      "memberships.isMember",
      await this.db
        .from("memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle(),
    );
    return row !== null;
  }
}
