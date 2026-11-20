import type { OrganizationId, UserId } from "../accounts";
import type { Bid, BidDetails, BidId, BidSource, BidStatus, NewBidEvent } from "./domain/bid";

export interface BidRepository {
  findIdByOcid(organizationId: OrganizationId, ocid: string): Promise<BidId | null>;
  /** Throws `TenderNotFoundError` if the process isn't in our data. */
  create(bid: {
    organizationId: OrganizationId;
    ocid: string;
    source: BidSource;
    createdBy: UserId;
  }): Promise<BidId>;
  get(organizationId: OrganizationId, bidId: BidId): Promise<Bid | null>;
  update(organizationId: OrganizationId, bidId: BidId, details: BidDetails): Promise<void>;
  /** False if there was nothing to delete (not found or not allowed). */
  remove(organizationId: OrganizationId, bidId: BidId): Promise<boolean>;
  /**
   * Creates bids from the SEACE history, each with a "created" event (source
   * seace_import). Skips processes already tracked. Returns how many were created.
   */
  importMany(
    organizationId: OrganizationId,
    createdBy: UserId,
    bids: readonly { ocid: string; status: BidStatus; awardedAmount: number | null }[],
  ): Promise<number>;
}

/** A process where the company's RUC bid or won, according to SEACE. */
export interface SeaceParticipation {
  readonly ocid: string;
  /** SEACE process code. */
  readonly title: string | null;
  readonly description: string | null;
  readonly buyerName: string | null;
  readonly datePublished: string | null;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly outcome: "won" | "lost" | "pending";
  readonly awardedAmount: number | null;
  readonly alreadyTracked: boolean;
}

export interface SeaceHistory {
  list(organizationId: OrganizationId): Promise<SeaceParticipation[]>;
}

/** Append-only history of a bid. */
export interface BidTimeline {
  append(
    organizationId: OrganizationId,
    bidId: BidId,
    actorId: UserId,
    events: readonly NewBidEvent[],
  ): Promise<void>;
}

export interface TeamDirectory {
  isMember(organizationId: OrganizationId, userId: UserId): Promise<boolean>;
}

export interface BidDocumentRecord {
  readonly id: string;
  readonly bidId: BidId;
  readonly storagePath: string;
  readonly name: string;
}

export interface BidDocumentRepository {
  add(document: {
    organizationId: OrganizationId;
    bidId: BidId;
    storagePath: string;
    name: string;
    sizeBytes: number;
    contentType: string;
    uploadedBy: UserId;
  }): Promise<string>;
  find(organizationId: OrganizationId, documentId: string): Promise<BidDocumentRecord | null>;
  remove(organizationId: OrganizationId, documentId: string): Promise<void>;
}

/** Private file storage. Browsers upload and download directly with short-lived signed URLs. */
export interface FileStorage {
  createUploadUrl(path: string): Promise<{ signedUrl: string; token: string }>;
  /** Size in bytes of an uploaded file, or null if it isn't there. */
  sizeOf(path: string): Promise<number | null>;
  createDownloadUrl(path: string, downloadName: string): Promise<string>;
  remove(path: string): Promise<void>;
}

export interface IdGenerator {
  uuid(): string;
}
