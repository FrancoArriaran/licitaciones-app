import type { Clock } from "../../shared";
import { normalizeRecordPackage } from "../domain/ocds";
import { isSamePeriod, periodsToSync, type Period } from "../domain/period";
import type {
  BidResultDetector,
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
  /** New results noted on open bids; null when nothing was loaded. */
  detectedResults: number | null;
  /** True if any month failed: the caller must report the run as failed. */
  failed: boolean;
}

export interface SyncOptions {
  /** Months to load; defaults to the recent ones. Older months are history (backfill). */
  periods?: readonly Period[];
}

/**
 * Daily ingestion, replacing the n8n "SEACE - Sincronización diaria" workflow:
 * download each month's file, normalize it, upsert tenders with their items,
 * documents and awards, and compute new matches for every profile. Idempotent.
 *
 * Documents (links to the bidding rules) are only kept for recent months: they
 * matter while a process is open, and history without them takes a third of the space.
 */
export class SyncTenders {
  constructor(
    private readonly source: ProcurementSource,
    private readonly writer: TenderWriter,
    private readonly matches: MatchRefresher,
    private readonly log: SyncRunLog,
    private readonly results: BidResultDetector,
    private readonly clock: Clock,
  ) {}

  async execute({ periods }: SyncOptions = {}): Promise<SyncSummary> {
    const now = this.clock.now();
    const recent = periodsToSync(now);
    const runs: SyncRun[] = [];

    for (const period of periods ?? recent) {
      const withDocuments = recent.some((month) => isSamePeriod(month, period));
      const run = await this.syncMonth(period, now, withDocuments);
      await this.log.record(run);
      runs.push(run);
    }

    const loaded = runs.some((run) => run.status === "ok");
    const matches = loaded ? await this.matches.refresh() : null;
    const detectedResults = loaded ? await this.results.detect() : null;
    return {
      runs,
      matches,
      detectedResults,
      failed: runs.some((run) => run.status === "error") || !loaded,
    };
  }

  private async syncMonth(period: Period, now: Date, withDocuments: boolean): Promise<SyncRun> {
    const empty = { period, tenders: 0, documents: 0, awards: 0 };
    try {
      const file = await this.source.fetchMonth(period);
      if (!file.published) return { ...empty, status: "not_published", errorMessage: null };

      const batch = normalizeRecordPackage(file.data);
      // Parents before children: everything else references tenders, award items reference awards.
      const tenders = await this.writer.upsertTenders(batch.tenders, now);
      await this.writer.upsertItems(batch.items, now);
      await this.writer.upsertParticipants(batch.participants, now);
      const documents = withDocuments ? await this.writer.upsertDocuments(batch.documents, now) : 0;
      const awards = await this.writer.upsertAwards(batch.awards, now);
      await this.writer.upsertAwardItems(batch.awardItems, now);
      return {
        period,
        status: "ok",
        tenders,
        documents,
        awards,
        errorMessage:
          batch.skipped > 0 ? `${batch.skipped} registros con formato inesperado omitidos` : null,
      };
    } catch (error) {
      return {
        ...empty,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
