import type { DocumentRow, TenderRow } from "./domain/ocds";
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

export type SyncRunStatus = "ok" | "not_published" | "error";

export interface SyncRun {
  period: Period;
  status: SyncRunStatus;
  tenders: number;
  documents: number;
  errorMessage: string | null;
}

/** One row per month and run in `sync_runs`, to see at a glance whether ingestion works. */
export interface SyncRunLog {
  record(run: SyncRun): Promise<void>;
}
