import type {
  AwardItemRow,
  AwardRow,
  DocumentRow,
  MatchRefresher,
  ParticipantRow,
  SyncRun,
  SyncRunLog,
  TenderItemRow,
  TenderRow,
  TenderWriter,
} from "@licitaciones/core/ingestion";
import { unwrap, type DbClient } from "../supabase/client";
import type { Database } from "../supabase/database.types";

/** Rows per request: keeps each upsert well under PostgREST's payload limits. */
const CHUNK_SIZE = 500;

function chunks<T>(rows: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    result.push(rows.slice(start, start + CHUNK_SIZE));
  }
  return result;
}

type IngestionTable =
  "tenders" | "documents" | "tender_items" | "tender_participants" | "awards" | "award_items";
type Insert<T extends IngestionTable> = Database["public"]["Tables"][T]["Insert"];

/** Needs the secret key: customers can only read procurement data. */
export class SupabaseTenderWriter implements TenderWriter {
  constructor(private readonly db: DbClient) {}

  upsertTenders(rows: readonly TenderRow[], updatedAt: Date) {
    return this.upsert("tenders", rows, "ocid", updatedAt);
  }

  upsertDocuments(rows: readonly DocumentRow[], updatedAt: Date) {
    return this.upsert("documents", rows, "id", updatedAt);
  }

  upsertItems(rows: readonly TenderItemRow[], updatedAt: Date) {
    return this.upsert("tender_items", rows, "ocid,item_id", updatedAt);
  }

  upsertAwards(rows: readonly AwardRow[], updatedAt: Date) {
    return this.upsert("awards", rows, "id", updatedAt);
  }

  upsertAwardItems(rows: readonly AwardItemRow[], updatedAt: Date) {
    return this.upsert("award_items", rows, "award_id,item_id", updatedAt);
  }

  /** Callers pass core rows; the signature checks they fit the table's columns. */
  upsertParticipants(rows: readonly ParticipantRow[], updatedAt: Date) {
    return this.upsert("tender_participants", rows, "ocid,party_id", updatedAt);
  }

  private async upsert<T extends IngestionTable>(
    table: T,
    rows: readonly Insert<T>[],
    onConflict: string,
    updatedAt: Date,
  ): Promise<number> {
    const updated_at = updatedAt.toISOString();
    for (const chunk of chunks(rows)) {
      // TypeScript can't narrow the generic table here; the signature already checked the rows.
      const payload = chunk.map((row) => ({ ...row, updated_at })) as never;
      unwrap(`upsert ${table}`, await this.db.from(table).upsert(payload, { onConflict }));
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
        awards_upserted: run.awards,
        status: run.status,
        error_message: run.errorMessage,
      }),
    );
  }
}
