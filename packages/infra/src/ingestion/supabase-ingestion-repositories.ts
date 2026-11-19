import type {
  DocumentRow,
  MatchRefresher,
  SyncRun,
  SyncRunLog,
  TenderRow,
  TenderWriter,
} from "@licitaciones/core/ingestion";
import { unwrap, type DbClient } from "../supabase/client";

/** Rows per request: keeps each upsert well under PostgREST's payload limits. */
const CHUNK_SIZE = 500;

function chunks<T>(rows: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    result.push(rows.slice(start, start + CHUNK_SIZE));
  }
  return result;
}

/** Needs the secret key: customers can only read tenders. */
export class SupabaseTenderWriter implements TenderWriter {
  constructor(private readonly db: DbClient) {}

  async upsertTenders(rows: readonly TenderRow[], updatedAt: Date) {
    const updated_at = updatedAt.toISOString();
    for (const chunk of chunks(rows)) {
      unwrap(
        "upsertTenders",
        await this.db.from("tenders").upsert(
          chunk.map((row) => ({ ...row, updated_at })),
          { onConflict: "ocid" },
        ),
      );
    }
    return rows.length;
  }

  async upsertDocuments(rows: readonly DocumentRow[], updatedAt: Date) {
    const updated_at = updatedAt.toISOString();
    for (const chunk of chunks(rows)) {
      unwrap(
        "upsertDocuments",
        await this.db.from("documents").upsert(
          chunk.map((row) => ({ ...row, updated_at })),
          { onConflict: "id" },
        ),
      );
    }
    return rows.length;
  }
}

export class SupabaseMatchRefresher implements MatchRefresher {
  constructor(private readonly db: DbClient) {}

  async refresh() {
    const alerts = unwrap("refreshAlertMatches", await this.db.rpc("refresh_alert_matches"));
    const prototype = unwrap("refreshTenderMatches", await this.db.rpc("refresh_tender_matches"));
    return { alerts, prototype };
  }
}

export class SupabaseSyncRunLog implements SyncRunLog {
  constructor(private readonly db: DbClient) {}

  async record(run: SyncRun) {
    unwrap(
      "recordSyncRun",
      await this.db.from("sync_runs").insert({
        year: run.period.year,
        month: run.period.month,
        tenders_upserted: run.tenders,
        documents_upserted: run.documents,
        status: run.status,
        error_message: run.errorMessage,
      }),
    );
  }
}
