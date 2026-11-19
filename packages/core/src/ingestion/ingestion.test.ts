import { describe, expect, it } from "vitest";
import type { Clock } from "../shared";
import {
  normalizeRecordPackage,
  periodsToSync,
  SyncTenders,
  type DocumentRow,
  type MonthlyFile,
  type Period,
  type SyncRun,
  type TenderRow,
} from "./index";

function release(overrides: Record<string, unknown> = {}) {
  return {
    ocid: "ocds-dgv273-seacev3-1001",
    date: "2026-11-18T10:00:00-05:00",
    buyer: { name: "MUNICIPALIDAD DISTRITAL DE SANTO DOMINGO" },
    parties: [
      { roles: ["supplier"], address: { department: "LIMA" } },
      {
        roles: ["buyer", "procuringEntity"],
        address: { department: "AREQUIPA", locality: "AREQUIPA" },
        additionalIdentifiers: [{ scheme: "PE-RUC", id: "20131312955" }],
      },
    ],
    tender: {
      id: "1001",
      title: "SIE-SIE-1-2026-MDSD-OEC-1",
      description: "ADQUISICION DE CEMENTO PORTLAND TIPO I",
      mainProcurementCategory: "goods",
      procurementMethodDetails: "Subasta Inversa Electrónica",
      value: { amount: 45000, currency: "PEN" },
      datePublished: "2026-11-17T09:00:00-05:00",
      enquiryPeriod: {
        startDate: "2026-11-17T00:00:00-05:00",
        endDate: "2026-11-20T23:59:00-05:00",
      },
      items: [
        { additionalClassifications: [{ scheme: "OTHER", id: "X" }] },
        {
          additionalClassifications: [
            { scheme: "UNSPSC", id: "30111601", description: "Cemento" },
            { scheme: "UNSPSC", id: "11111111", description: "Ignored" },
          ],
        },
      ],
      documents: [
        {
          id: "doc-1",
          url: "https://seace/doc-1",
          format: "pdf",
          documentType: "biddingDocuments",
          title: "Bases",
          datePublished: "2026-11-17",
        },
        { id: "", title: "Sin id" },
      ],
    },
    ...overrides,
  };
}

const pkg = (...releases: unknown[]) => ({
  records: releases.map((compiledRelease) => ({ compiledRelease })),
});

describe("normalizeRecordPackage", () => {
  it("maps a release exactly like the n8n nodes did", () => {
    const { tenders, documents, skipped } = normalizeRecordPackage(pkg(release()));
    expect(skipped).toBe(0);
    expect(tenders).toEqual<TenderRow[]>([
      {
        ocid: "ocds-dgv273-seacev3-1001",
        tender_id: "1001",
        title: "SIE-SIE-1-2026-MDSD-OEC-1",
        description: "ADQUISICION DE CEMENTO PORTLAND TIPO I",
        buyer_name: "MUNICIPALIDAD DISTRITAL DE SANTO DOMINGO",
        buyer_ruc: "20131312955",
        department: "AREQUIPA",
        locality: "AREQUIPA",
        main_category: "goods",
        procurement_method: "Subasta Inversa Electrónica",
        amount: 45000,
        currency: "PEN",
        date_published: "2026-11-17T09:00:00-05:00",
        enquiry_start: "2026-11-17T00:00:00-05:00",
        enquiry_end: "2026-11-20T23:59:00-05:00",
        unspsc_code: "30111601",
        unspsc_segment: "30",
        unspsc_family: "3011",
        unspsc_description: "Cemento",
        source_release_date: "2026-11-18T10:00:00-05:00",
      },
    ]);
    expect(documents).toEqual<DocumentRow[]>([
      {
        id: "doc-1",
        ocid: "ocds-dgv273-seacev3-1001",
        url: "https://seace/doc-1",
        format: "pdf",
        document_type: "biddingDocuments",
        title: "Bases",
        date_published: "2026-11-17",
      },
    ]);
  });

  it("turns missing or empty values into null and keeps a zero amount", () => {
    const sparse = { ocid: "ocds-2", tender: { title: "", value: { amount: 0 } } };
    const [row] = normalizeRecordPackage(pkg(sparse)).tenders;
    expect(row).toMatchObject({
      title: null,
      amount: 0,
      buyer_name: null,
      department: null,
      unspsc_family: null,
      source_release_date: null,
    });
  });

  it("skips records without a release or ocid, and counts malformed ones", () => {
    const result = normalizeRecordPackage({
      records: [
        {},
        { compiledRelease: { ocid: "" } },
        { compiledRelease: { ocid: "x", parties: "?" } },
      ],
    });
    expect(result.tenders).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it("keeps the last copy of a repeated tender or document", () => {
    const first = release();
    const second = release({ buyer: { name: "UPDATED" } });
    const { tenders, documents } = normalizeRecordPackage(pkg(first, second));
    expect(tenders).toHaveLength(1);
    expect(tenders[0]?.buyer_name).toBe("UPDATED");
    expect(documents).toHaveLength(1);
  });

  it("accepts a file without records", () => {
    expect(normalizeRecordPackage({}).tenders).toEqual([]);
  });

  it("rejects something that isn't a record package", () => {
    expect(() => normalizeRecordPackage("<html>")).toThrow();
  });
});

describe("periodsToSync", () => {
  it("syncs only the current month after the first days", () => {
    expect(periodsToSync(new Date("2026-11-19T10:00:00Z"))).toEqual([{ year: 2026, month: 11 }]);
  });

  it("also re-reads the previous month in the first five days (Lima time)", () => {
    // 1 Jan 03:00 UTC is still 31 Dec in Lima.
    expect(periodsToSync(new Date("2026-01-01T03:00:00Z"))).toEqual([{ year: 2025, month: 12 }]);
    expect(periodsToSync(new Date("2026-01-05T10:00:00Z"))).toEqual([
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
  });
});

describe("SyncTenders", () => {
  const clock: Clock = { now: () => new Date("2026-11-03T10:00:00Z") };

  function setup(files: Record<string, MonthlyFile | Error>) {
    const upserted = { tenders: [] as string[], documents: [] as string[] };
    const runs: SyncRun[] = [];
    let refreshed = 0;
    const useCase = new SyncTenders(
      {
        fetchMonth: async ({ year, month }: Period) => {
          const file = files[`${year}-${month}`];
          if (!file) throw new Error("unexpected period");
          if (file instanceof Error) throw file;
          return file;
        },
      },
      {
        upsertTenders: async (rows) => {
          upserted.tenders.push(...rows.map((row) => row.ocid));
          return rows.length;
        },
        upsertDocuments: async (rows) => {
          upserted.documents.push(...rows.map((row) => row.id));
          return rows.length;
        },
      },
      {
        refresh: async () => {
          refreshed += 1;
          return { alerts: 2, prototype: 1 };
        },
      },
      { record: async (run) => void runs.push(run) },
      clock,
    );
    return { useCase, upserted, runs, refreshed: () => refreshed };
  }

  it("loads both months, logs each run and refreshes matches once", async () => {
    const { useCase, upserted, runs, refreshed } = setup({
      "2026-10": { published: true, data: pkg(release({ ocid: "oct-1" })) },
      "2026-11": { published: true, data: pkg(release({ ocid: "nov-1" })) },
    });
    const summary = await useCase.execute();
    expect(upserted.tenders).toEqual(["oct-1", "nov-1"]);
    expect(runs.map((run) => [run.period.month, run.status, run.tenders, run.documents])).toEqual([
      [10, "ok", 1, 1],
      [11, "ok", 1, 1],
    ]);
    expect(refreshed()).toBe(1);
    expect(summary).toMatchObject({ failed: false, matches: { alerts: 2, prototype: 1 } });
  });

  it("treats a month not published yet as normal, not as a failure", async () => {
    const { useCase, runs } = setup({
      "2026-10": { published: true, data: pkg(release()) },
      "2026-11": { published: false },
    });
    const summary = await useCase.execute();
    expect(runs[1]?.status).toBe("not_published");
    expect(summary.failed).toBe(false);
  });

  it("records a failing month, still loads the other one and reports failure", async () => {
    const { useCase, runs, refreshed } = setup({
      "2026-10": new Error("SEACE returned HTTP 503"),
      "2026-11": { published: true, data: pkg(release()) },
    });
    const summary = await useCase.execute();
    expect(runs[0]).toMatchObject({ status: "error", errorMessage: "SEACE returned HTTP 503" });
    expect(runs[1]?.status).toBe("ok");
    expect(refreshed()).toBe(1);
    expect(summary.failed).toBe(true);
  });

  it("doesn't refresh matches and fails when nothing could be loaded", async () => {
    const { useCase, refreshed } = setup({
      "2026-10": { published: false },
      "2026-11": { published: false },
    });
    const summary = await useCase.execute();
    expect(refreshed()).toBe(0);
    expect(summary).toMatchObject({ failed: true, matches: null });
  });
});
