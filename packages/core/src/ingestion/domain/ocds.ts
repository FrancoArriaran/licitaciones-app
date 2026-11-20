import { z } from "zod";

/**
 * Normalizes SEACE's OCDS record packages (the monthly file of
 * contratacionesabiertas.oece.gob.pe) into rows for `tenders`, `documents`,
 * `tender_items`, `awards` and `award_items`.
 *
 * Tenders and documents follow a line-by-line port of the n8n "Normalizar tenders" and
 * "Normalizar documents" nodes (legacy/n8n), so the database ends up exactly as
 * n8n left it: empty strings become null, the buyer is the first party with role
 * `procuringEntity` or `buyer`, and the category is the first UNSPSC code found.
 */

/** Text field as n8n read it (`value || null`); numbers are kept as text. */
const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined || value === "" ? null : String(value),
  );

const classificationSchema = z.object({ scheme: text, id: text, description: text });

/** Numbers from fields n8n never read: anything unexpected becomes null, never a skipped record. */
const amount = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .nullish()
  .transform((value) => (value === null || value === undefined ? null : Number(value)))
  .catch(null);

const itemSchema = z.object({
  id: text.catch(null),
  position: amount,
  description: text.catch(null),
  statusDetails: text.catch(null),
  classification: z.object({ scheme: text, id: text }).nullish().catch(null),
  additionalClassifications: z.array(classificationSchema).nullish(),
  quantity: amount,
  unit: z.object({ name: text }).nullish().catch(null),
  totalValue: z.object({ amount }).nullish().catch(null),
});

const awardSchema = z.object({
  id: text,
  date: text,
  value: z.object({ amount, currency: text }).nullish(),
  suppliers: z.array(z.object({ id: text, name: text })).nullish(),
  items: z.array(itemSchema).nullish(),
});

const partySchema = z.object({
  roles: z.array(z.string()).nullish(),
  address: z.object({ department: text, locality: text }).nullish(),
  additionalIdentifiers: z.array(z.object({ scheme: text, id: text })).nullish(),
});

const documentSchema = z.object({
  id: text,
  url: text,
  format: text,
  documentType: text,
  title: text,
  datePublished: text,
});

const releaseSchema = z.object({
  ocid: text,
  date: text,
  buyer: z.object({ name: text }).nullish(),
  parties: z.array(partySchema).nullish(),
  tender: z
    .object({
      id: text,
      title: text,
      description: text,
      mainProcurementCategory: text,
      procurementMethodDetails: text,
      value: z.object({ amount: z.number().nullish(), currency: text }).nullish(),
      datePublished: text,
      enquiryPeriod: z.object({ startDate: text, endDate: text }).nullish(),
      items: z.array(itemSchema).nullish(),
      documents: z.array(documentSchema).nullish(),
      tenderPeriod: z.object({ endDate: text }).nullish().catch(null),
      numberOfTenderers: amount,
      tenderers: z
        .array(z.object({ id: text, name: text }))
        .nullish()
        .catch(null),
    })
    .nullish(),
  awards: z.array(awardSchema).nullish().catch(null),
});

const packageSchema = z.object({ records: z.array(z.unknown()).nullish() });
const recordSchema = z.object({ compiledRelease: releaseSchema.nullish() });

export interface TenderRow {
  ocid: string;
  tender_id: string | null;
  title: string | null;
  description: string | null;
  buyer_name: string | null;
  buyer_ruc: string | null;
  department: string | null;
  locality: string | null;
  main_category: string | null;
  procurement_method: string | null;
  amount: number | null;
  currency: string | null;
  date_published: string | null;
  enquiry_start: string | null;
  enquiry_end: string | null;
  unspsc_code: string | null;
  unspsc_segment: string | null;
  unspsc_family: string | null;
  unspsc_description: string | null;
  source_release_date: string | null;
  /** Not in n8n: how many companies submitted an offer, when SEACE says. */
  number_of_tenderers: number | null;
  /** Not in n8n: deadline to submit offers. */
  tender_end: string | null;
}

/** A company that submitted an offer. */
export interface ParticipantRow {
  ocid: string;
  party_id: string;
  /** Null for consortia, which SEACE identifies with an internal id. */
  ruc: string | null;
  name: string | null;
}

export interface DocumentRow {
  id: string;
  ocid: string;
  url: string | null;
  format: string | null;
  document_type: string | null;
  title: string | null;
  date_published: string | null;
}

export interface TenderItemRow {
  ocid: string;
  item_id: string;
  position: number | null;
  description: string | null;
  /** SEACE's 16-digit product code (CUBSO), the most specific one. */
  cubso_code: string | null;
  /** 8-digit UNSPSC commodity. */
  unspsc_code: string | null;
  quantity: number | null;
  unit_name: string | null;
  amount: number | null;
  status_details: string | null;
}

export interface AwardRow {
  id: string;
  ocid: string;
  award_date: string | null;
  amount: number | null;
  currency: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  /** Null for consortia, which SEACE identifies with an internal id instead of a RUC. */
  supplier_ruc: string | null;
}

export interface AwardItemRow {
  award_id: string;
  item_id: string;
  ocid: string;
  description: string | null;
  cubso_code: string | null;
  unspsc_code: string | null;
  quantity: number | null;
  unit_name: string | null;
  amount: number | null;
}

export interface NormalizedBatch {
  tenders: TenderRow[];
  documents: DocumentRow[];
  items: TenderItemRow[];
  awards: AwardRow[];
  awardItems: AwardItemRow[];
  participants: ParticipantRow[];
  /** Records whose shape didn't match OCDS and were left out. */
  skipped: number;
}

type Release = z.infer<typeof releaseSchema>;
type Item = z.infer<typeof itemSchema>;

function itemCodes(item: Item) {
  const cubso = item.classification?.scheme === "CUBSO" ? item.classification.id : null;
  const unspsc = (item.additionalClassifications ?? []).find((c) => c.scheme === "UNSPSC");
  return { cubso_code: cubso, unspsc_code: unspsc?.id ?? null };
}

function rucFromPartyId(id: string | null): string | null {
  return /^PE-RUC-(\d{11})$/.exec(id ?? "")?.[1] ?? null;
}

function numberOfTenderers(release: Release): number | null {
  const tender = release.tender;
  if (tender?.numberOfTenderers != null) return tender.numberOfTenderers;
  return tender?.tenderers ? tender.tenderers.length : null;
}

function buyerDetails(release: Release) {
  let department: string | null = null;
  let locality: string | null = null;
  let buyerRuc: string | null = null;
  for (const party of release.parties ?? []) {
    const roles = party.roles ?? [];
    if (roles.includes("procuringEntity") || roles.includes("buyer")) {
      department = party.address?.department ?? department;
      locality = party.address?.locality ?? locality;
      for (const identifier of party.additionalIdentifiers ?? []) {
        if (identifier.scheme === "PE-RUC") buyerRuc = identifier.id;
      }
      break;
    }
  }
  return { department, locality, buyerRuc };
}

function firstUnspsc(release: Release) {
  for (const item of release.tender?.items ?? []) {
    for (const classification of item.additionalClassifications ?? []) {
      if (classification.scheme === "UNSPSC") {
        const code = classification.id ?? "";
        return {
          unspsc_code: code,
          unspsc_segment: code.slice(0, 2),
          unspsc_family: code.slice(0, 4),
          unspsc_description: classification.description,
        };
      }
    }
  }
  return { unspsc_code: null, unspsc_segment: null, unspsc_family: null, unspsc_description: null };
}

function toTenderRow(ocid: string, release: Release): TenderRow {
  const tender = release.tender;
  const { department, locality, buyerRuc } = buyerDetails(release);
  return {
    ocid,
    tender_id: tender?.id ?? null,
    title: tender?.title ?? null,
    description: tender?.description ?? null,
    buyer_name: release.buyer?.name ?? null,
    buyer_ruc: buyerRuc,
    department,
    locality,
    main_category: tender?.mainProcurementCategory ?? null,
    procurement_method: tender?.procurementMethodDetails ?? null,
    amount: tender?.value?.amount ?? null,
    currency: tender?.value?.currency ?? null,
    date_published: tender?.datePublished ?? null,
    enquiry_start: tender?.enquiryPeriod?.startDate ?? null,
    enquiry_end: tender?.enquiryPeriod?.endDate ?? null,
    ...firstUnspsc(release),
    source_release_date: release.date,
    number_of_tenderers: numberOfTenderers(release),
    tender_end: tender?.tenderPeriod?.endDate ?? null,
  };
}

/** Last occurrence wins, like upserting the rows one by one. */
function dedupeBy<T>(rows: T[], key: (row: T) => string): T[] {
  return [...new Map(rows.map((row) => [key(row), row])).values()];
}

export function normalizeRecordPackage(file: unknown): NormalizedBatch {
  const records = packageSchema.parse(file).records ?? [];
  const tenders: TenderRow[] = [];
  const documents: DocumentRow[] = [];
  const items: TenderItemRow[] = [];
  const awards: AwardRow[] = [];
  const awardItems: AwardItemRow[] = [];
  const participants: ParticipantRow[] = [];
  let skipped = 0;

  for (const raw of records) {
    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    const release = parsed.data.compiledRelease;
    const ocid = release?.ocid;
    if (!release || !ocid) continue;

    tenders.push(toTenderRow(ocid, release));
    for (const document of release.tender?.documents ?? []) {
      if (!document.id) continue;
      documents.push({
        id: document.id,
        ocid,
        url: document.url,
        format: document.format,
        document_type: document.documentType,
        title: document.title,
        date_published: document.datePublished,
      });
    }

    for (const item of release.tender?.items ?? []) {
      if (!item.id) continue;
      items.push({
        ocid,
        item_id: item.id,
        position: item.position,
        description: item.description,
        ...itemCodes(item),
        quantity: item.quantity,
        unit_name: item.unit?.name ?? null,
        amount: item.totalValue?.amount ?? null,
        status_details: item.statusDetails,
      });
    }

    for (const tenderer of release.tender?.tenderers ?? []) {
      if (!tenderer.id) continue;
      participants.push({
        ocid,
        party_id: tenderer.id,
        ruc: rucFromPartyId(tenderer.id),
        name: tenderer.name,
      });
    }

    for (const award of release.awards ?? []) {
      if (!award.id) continue;
      const awardId = award.id;
      // SEACE awards have one supplier (a consortium counts as one).
      const supplier = award.suppliers?.[0];
      awards.push({
        id: awardId,
        ocid,
        award_date: award.date,
        amount: award.value?.amount ?? null,
        currency: award.value?.currency ?? null,
        supplier_id: supplier?.id ?? null,
        supplier_name: supplier?.name ?? null,
        supplier_ruc: rucFromPartyId(supplier?.id ?? null),
      });
      for (const item of award.items ?? []) {
        if (!item.id) continue;
        awardItems.push({
          award_id: awardId,
          item_id: item.id,
          ocid,
          description: item.description,
          ...itemCodes(item),
          quantity: item.quantity,
          unit_name: item.unit?.name ?? null,
          amount: item.totalValue?.amount ?? null,
        });
      }
    }
  }

  return {
    tenders: dedupeBy(tenders, (row) => row.ocid),
    documents: dedupeBy(documents, (row) => row.id),
    items: dedupeBy(items, (row) => `${row.ocid}|${row.item_id}`),
    awards: dedupeBy(awards, (row) => row.id),
    awardItems: dedupeBy(awardItems, (row) => `${row.award_id}|${row.item_id}`),
    participants: dedupeBy(participants, (row) => `${row.ocid}|${row.party_id}`),
    skipped,
  };
}
