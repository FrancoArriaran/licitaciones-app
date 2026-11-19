import { z } from "zod";

/**
 * Normalizes SEACE's OCDS record packages (the monthly file of
 * contratacionesabiertas.oece.gob.pe) into rows for `tenders` and `documents`.
 *
 * The rules are a line-by-line port of the n8n "Normalizar tenders" and
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
      items: z
        .array(z.object({ additionalClassifications: z.array(classificationSchema).nullish() }))
        .nullish(),
      documents: z.array(documentSchema).nullish(),
    })
    .nullish(),
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

export interface NormalizedBatch {
  tenders: TenderRow[];
  documents: DocumentRow[];
  /** Records whose shape didn't match OCDS and were left out. */
  skipped: number;
}

type Release = z.infer<typeof releaseSchema>;

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
  }

  return {
    tenders: dedupeBy(tenders, (row) => row.ocid),
    documents: dedupeBy(documents, (row) => row.id),
    skipped,
  };
}
