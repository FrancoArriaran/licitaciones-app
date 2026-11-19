import type { Clock } from "../../shared";
import { normalizeRecordPackage } from "../domain/ocds";
import { periodsToSync, type Period } from "../domain/period";
import type {
  MatchRefresher,
  ProcurementSource,
  RefreshedMatches,
  SyncRun,
  SyncRunLog,
  TenderWriter,
} from "../ports";

export interface SyncSummary {
  runs: SyncRun[];
  /** Null when no month could be loaded, so there was nothing new to match. */
  matches: RefreshedMatches | null;
  /** True if any month failed: the caller must report the run as failed. */
  failed: boolean;
}

/**
 * Daily ingestion, replacing the n8n "SEACE - Sincronización diaria" workflow:
 * download the month's file, normalize it, upsert tenders and then their
 * documents, and compute new matches for every profile. Idempotent.
 */
export class SyncTenders {
  constructor(
    private readonly source: ProcurementSource,
    private readonly writer: TenderWriter,
    private readonly matches: MatchRefresher,
    private readonly log: SyncRunLog,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<SyncSummary> {
    const now = this.clock.now();
    const runs: SyncRun[] = [];

    for (const period of periodsToSync(now)) {
      const run = await this.syncMonth(period, now);
      await this.log.record(run);
      runs.push(run);
    }

    const loaded = runs.some((run) => run.status === "ok");
    const matches = loaded ? await this.matches.refresh() : null;
    return {
      runs,
      matches,
      failed: runs.some((run) => run.status === "error") || !loaded,
    };
  }

  private async syncMonth(period: Period, now: Date): Promise<SyncRun> {
    try {
      const file = await this.source.fetchMonth(period);
      if (!file.published) {
        return { period, status: "not_published", tenders: 0, documents: 0, errorMessage: null };
      }

      const batch = normalizeRecordPackage(file.data);
      // Tenders first: documents reference them.
      const tenders = await this.writer.upsertTenders(batch.tenders, now);
      const documents = await this.writer.upsertDocuments(batch.documents, now);
      return {
        period,
        status: "ok",
        tenders,
        documents,
        errorMessage:
          batch.skipped > 0 ? `${batch.skipped} registros con formato inesperado omitidos` : null,
      };
    } catch (error) {
      return {
        period,
        status: "error",
        tenders: 0,
        documents: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
