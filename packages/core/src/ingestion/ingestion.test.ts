import { describe, expect, it } from "vitest";
import type { Clock } from "../shared";
import {
  monthRange,
  normalizeRecordPackage,
  parsePeriod,
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
          id: "21402003",
          position: "1",
          description: "CEMENTO PORTLAND TIPO I X 42.5 KG",
          statusDetails: "CONVOCADO",
          classification: { scheme: "CUBSO", id: "3011160100000001" },
          additionalClassifications: [
            { scheme: "UNSPSC", id: "30111601", description: "Cemento" },
            { scheme: "UNSPSC", id: "11111111", description: "Ignored" },
          ],
          quantity: 500,
          unit: { name: "Bolsa" },
          totalValue: { amount: 13500 },
        },
      ],
      tenderPeriod: { endDate: "2026-11-27T23:59:00-05:00" },
      numberOfTenderers: 2,
      tenderers: [
        { id: "PE-RUC-20100000001", name: "FERRETERIA SUR SAC" },
        { id: "PE-RUC-1848498", name: "CONSORCIO NORTE" },
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
    awards: [
      {
        id: "1001-1848498",
        date: "2026-11-25T00:00:00-05:00",
        value: { amount: 13000, currency: "PEN" },
        suppliers: [{ id: "PE-RUC-20100000001", name: "FERRETERIA SUR SAC" }],
        items: [
          {
            id: "21402003",
            description: "CEMENTO PORTLAND TIPO I X 42.5 KG",
            classification: { scheme: "CUBSO", id: "3011160100000001" },
            additionalClassifications: [{ scheme: "UNSPSC", id: "30111601" }],
            quantity: 500,
            unit: { name: "Bolsa" },
            totalValue: { amount: 13000 },
          },
        ],
      },
    ],
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
        number_of_tenderers: 2,
        tender_end: "2026-11-27T23:59:00-05:00",
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

  it("extracts items, the award, its winner and the awarded items", () => {
    const { items, awards, awardItems } = normalizeRecordPackage(pkg(release()));
    expect(items).toEqual([
      {
        ocid: "ocds-dgv273-seacev3-1001",
        item_id: "21402003",
        position: 1,
        description: "CEMENTO PORTLAND TIPO I X 42.5 KG",
        cubso_code: "3011160100000001",
        unspsc_code: "30111601",
        quantity: 500,
        unit_name: "Bolsa",
        amount: 13500,
        status_details: "CONVOCADO",
      },
    ]);
    expect(awards).toEqual([
      {
        id: "1001-1848498",
        ocid: "ocds-dgv273-seacev3-1001",
        award_date: "2026-11-25T00:00:00-05:00",
        amount: 13000,
        currency: "PEN",
        supplier_id: "PE-RUC-20100000001",
        supplier_name: "FERRETERIA SUR SAC",
        supplier_ruc: "20100000001",
      },
    ]);
    expect(awardItems).toEqual([
      {
        award_id: "1001-1848498",
        item_id: "21402003",
        ocid: "ocds-dgv273-seacev3-1001",
        description: "CEMENTO PORTLAND TIPO I X 42.5 KG",
        cubso_code: "3011160100000001",
        unspsc_code: "30111601",
        quantity: 500,
        unit_name: "Bolsa",
        amount: 13000,
      },
    ]);
  });

  it("lists every bidder, with the RUC when SEACE gives one", () => {
    expect(normalizeRecordPackage(pkg(release())).participants).toEqual([
      {
        ocid: "ocds-dgv273-seacev3-1001",
        party_id: "PE-RUC-20100000001",
        ruc: "20100000001",
        name: "FERRETERIA SUR SAC",
      },
      {
        ocid: "ocds-dgv273-seacev3-1001",
        party_id: "PE-RUC-1848498",
        ruc: null,
        name: "CONSORCIO NORTE",
      },
    ]);
  });

  it("keeps consortia without a RUC and counts bidders from the list when no total is given", () => {
    const base = release();
    const result = normalizeRecordPackage(
      pkg({
        ...base,
        tender: { ...base.tender, numberOfTenderers: undefined },
        awards: [{ id: "a", suppliers: [{ id: "PE-RUC-1848498", name: "CONSORCIO X" }] }],
      }),
    );
    expect(result.tenders[0]?.number_of_tenderers).toBe(2);
    expect(result.awards[0]?.supplier_ruc).toBeNull();
  });

  it("never drops a tender because its awards look odd", () => {
    const result = normalizeRecordPackage(pkg(release({ awards: "not a list" })));
    expect(result.tenders).toHaveLength(1);
    expect(result.awards).toEqual([]);
    expect(result.skipped).toBe(0);
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

describe("periods", () => {
  it("syncs the current month in Lima and the two before it", () => {
    expect(periodsToSync(new Date("2026-11-19T10:00:00Z"))).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
    ]);
    // 1 Jan 03:00 UTC is still 31 Dec in Lima.
    expect(periodsToSync(new Date("2026-01-01T03:00:00Z"))).toEqual([
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
    ]);
  });

  it("lists every month of a range across years", () => {
    expect(monthRange({ year: 2025, month: 11 }, { year: 2026, month: 2 })).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
    expect(monthRange({ year: 2026, month: 3 }, { year: 2026, month: 1 })).toEqual([]);
  });

  it("parses YYYY-MM", () => {
    expect(parsePeriod("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(parsePeriod("2026-13")).toBeNull();
    expect(parsePeriod("03-2026")).toBeNull();
  });
});

describe("SyncTenders", () => {
  // Recent months for this date: September, October and November 2026.
  const clock: Clock = { now: () => new Date("2026-11-19T10:00:00Z") };
  const ok = (ocid: string): MonthlyFile => ({ published: true, data: pkg(release({ ocid })) });

  function setup(files: Record<string, MonthlyFile | Error>) {
    const writes: string[] = [];
    const runs: SyncRun[] = [];
    let refreshed = 0;
    const record = (table: string) => async (rows: readonly unknown[]) => {
      writes.push(`${table}:${rows.length}`);
      return rows.length;
    };
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
        upsertTenders: record("tenders"),
        upsertItems: record("items"),
        upsertDocuments: record("documents"),
        upsertAwards: record("awards"),
        upsertAwardItems: record("award_items"),
        upsertParticipants: record("participants"),
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
    return { useCase, writes, runs, refreshed: () => refreshed };
  }

  it("loads the recent months in order, parents first, and refreshes matches once", async () => {
    const { useCase, writes, runs, refreshed } = setup({
      "2026-9": ok("sep-1"),
      "2026-10": ok("oct-1"),
      "2026-11": ok("nov-1"),
    });
    const summary = await useCase.execute();
    expect(writes.slice(0, 6)).toEqual([
      "tenders:1",
      "items:1",
      "participants:2",
      "documents:1",
      "awards:1",
      "award_items:1",
    ]);
    expect(
      runs.map((run) => [run.period.month, run.status, run.tenders, run.documents, run.awards]),
    ).toEqual([
      [9, "ok", 1, 1, 1],
      [10, "ok", 1, 1, 1],
      [11, "ok", 1, 1, 1],
    ]);
    expect(refreshed()).toBe(1);
    expect(summary).toMatchObject({ failed: false, matches: { alerts: 2, prototype: 1 } });
  });

  it("loads history without documents", async () => {
    const { useCase, writes, runs } = setup({ "2026-3": ok("mar-1"), "2026-10": ok("oct-1") });
    await useCase.execute({
      periods: [
        { year: 2026, month: 3 },
        { year: 2026, month: 10 },
      ],
    });
    expect(writes.filter((write) => write.startsWith("documents"))).toEqual(["documents:1"]);
    expect(runs.map((run) => run.documents)).toEqual([0, 1]);
  });

  it("treats a month not published yet as normal, not as a failure", async () => {
    const { useCase, runs } = setup({
      "2026-9": ok("sep-1"),
      "2026-10": ok("oct-1"),
      "2026-11": { published: false },
    });
    const summary = await useCase.execute();
    expect(runs[2]?.status).toBe("not_published");
    expect(summary.failed).toBe(false);
  });

  it("records a failing month, still loads the others and reports failure", async () => {
    const { useCase, runs, refreshed } = setup({
      "2026-9": new Error("SEACE returned HTTP 503"),
      "2026-10": ok("oct-1"),
      "2026-11": ok("nov-1"),
    });
    const summary = await useCase.execute();
    expect(runs[0]).toMatchObject({ status: "error", errorMessage: "SEACE returned HTTP 503" });
    expect(runs[1]?.status).toBe("ok");
    expect(refreshed()).toBe(1);
    expect(summary.failed).toBe(true);
  });

  it("doesn't refresh matches and fails when nothing could be loaded", async () => {
    const { useCase, refreshed } = setup({
      "2026-9": { published: false },
      "2026-10": { published: false },
      "2026-11": { published: false },
    });
    const summary = await useCase.execute();
    expect(refreshed()).toBe(0);
    expect(summary).toMatchObject({ failed: true, matches: null });
  });
});
