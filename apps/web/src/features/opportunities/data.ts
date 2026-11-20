import "server-only";
import { unwrap } from "@licitaciones/infra";
import { getDb } from "@/lib/session";

/** Reads for the opportunity page. RLS only returns rows to active subscriptions. */

export interface OpportunityDetail {
  ocid: string;
  /** SEACE process code. */
  title: string | null;
  description: string | null;
  buyerName: string | null;
  department: string | null;
  locality: string | null;
  procurementMethod: string | null;
  amount: number | null;
  currency: string | null;
  datePublished: string | null;
  enquiryEnd: string | null;
  numberOfTenderers: number | null;
  items: {
    id: string;
    description: string | null;
    quantity: number | null;
    unitName: string | null;
    amount: number | null;
  }[];
  documents: {
    id: string;
    title: string | null;
    url: string | null;
    datePublished: string | null;
  }[];
}

export interface SimilarAward {
  matchLevel: "product" | "category";
  ocid: string;
  tenderDescription: string | null;
  buyerName: string | null;
  department: string | null;
  awardDate: string | null;
  supplierName: string | null;
  supplierRuc: string | null;
  itemDescription: string | null;
  quantity: number | null;
  unitName: string | null;
  amount: number | null;
  unitPrice: number | null;
  currency: string | null;
  numberOfTenderers: number | null;
}

export async function getOpportunity(ocid: string): Promise<OpportunityDetail | null> {
  if (!/^ocds-[\w-]+$/.test(ocid)) return null;
  const db = await getDb();
  const row = unwrap(
    "tenders.detail",
    await db
      .from("tenders")
      .select(
        "ocid, title, description, buyer_name, department, locality, procurement_method, amount, currency, date_published, enquiry_end, number_of_tenderers, tender_items(item_id, position, description, quantity, unit_name, amount), documents(id, title, url, date_published)",
      )
      .eq("ocid", ocid)
      .maybeSingle(),
  );
  if (!row) return null;

  return {
    ocid: row.ocid,
    title: row.title,
    description: row.description,
    buyerName: row.buyer_name,
    department: row.department,
    locality: row.locality,
    procurementMethod: row.procurement_method,
    amount: row.amount,
    currency: row.currency,
    datePublished: row.date_published,
    enquiryEnd: row.enquiry_end,
    numberOfTenderers: row.number_of_tenderers,
    items: [...row.tender_items]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((item) => ({
        id: item.item_id,
        description: item.description,
        quantity: item.quantity,
        unitName: item.unit_name,
        amount: item.amount,
      })),
    documents: [...row.documents]
      .sort((a, b) => (a.date_published ?? "").localeCompare(b.date_published ?? ""))
      .map((document) => ({
        id: document.id,
        title: document.title,
        url: document.url,
        datePublished: document.date_published,
      })),
  };
}

export async function listSimilarAwards(ocid: string, limit = 3): Promise<SimilarAward[]> {
  const db = await getDb();
  const rows = unwrap(
    "last_similar_awards",
    await db.rpc("last_similar_awards", { p_ocid: ocid, p_limit: limit }),
  );
  return rows.map((row) => ({
    matchLevel: row.match_level === "product" ? "product" : "category",
    ocid: row.ocid,
    tenderDescription: row.tender_description,
    buyerName: row.buyer_name,
    department: row.department,
    awardDate: row.award_date,
    supplierName: row.supplier_name,
    supplierRuc: row.supplier_ruc,
    itemDescription: row.item_description,
    quantity: row.quantity,
    unitName: row.unit_name,
    amount: row.amount,
    unitPrice: row.unit_price,
    currency: row.currency,
    numberOfTenderers: row.number_of_tenderers,
  }));
}
