import type {
  AwardItemRow,
  AwardRow,
  DocumentRow,
  ParticipantRow,
  TenderItemRow,
  TenderRow,
} from "./domain/ocds";
import type { Period } from "./domain/period";

export type MonthlyFile = { published: true; data: unknown } | { published: false };

/** Where tenders come from. SEACE today; Perú Compras would be another adapter. */
export interface ProcurementSource {
  /** The month's file as parsed JSON, or `published: false` if the source doesn't have it yet. */
  fetchMonth(period: Period): Promise<MonthlyFile>;
}

/** Ingestion-only writes. Upserts by natural key, so re-running never duplicates. */
export interface TenderWriter {
  upsertTenders(rows: readonly TenderRow[], updatedAt: Date): Promise<number>;
  upsertDocuments(rows: readonly DocumentRow[], updatedAt: Date): Promise<number>;
  upsertItems(rows: readonly TenderItemRow[], updatedAt: Date): Promise<number>;
  upsertAwards(rows: readonly AwardRow[], updatedAt: Date): Promise<number>;
  upsertAwardItems(rows: readonly AwardItemRow[], updatedAt: Date): Promise<number>;
  upsertParticipants(rows: readonly ParticipantRow[], updatedAt: Date): Promise<number>;
}

export interface RefreshedMatches {
  /** New matches for customers' alert profiles. */
  alerts: number;
  /** New matches for the n8n prototype profiles (`mype_profiles`). */
  prototype: number;
}

export interface MatchRefresher {
  refresh(): Promise<RefreshedMatches>;
}

/** Notes on open bids when SEACE publishes their award; the company confirms them. */
export interface BidResultDetector {
  /** How many new results were noted. Idempotent. */
  detect(): Promise<number>;
}

export type SyncRunStatus = "ok" | "not_published" | "error";

export interface SyncRun {
  period: Period;
  status: SyncRunStatus;
  tenders: number;
  documents: number;
  awards: number;
  errorMessage: string | null;
}

/** One row per month and run in `sync_runs`, to see at a glance whether ingestion works. */
export interface SyncRunLog {
  record(run: SyncRun): Promise<void>;
}
