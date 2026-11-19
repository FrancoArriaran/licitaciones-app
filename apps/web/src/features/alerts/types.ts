/** A tender as shown in previews and match lists. Dates are ISO strings (serializable). */
export interface Opportunity {
  ocid: string;
  /** SEACE process code, e.g. "SIE-SIE-1-2026-MDSD-OEC-1". */
  title: string | null;
  /** Readable description of what is being bought. */
  description: string | null;
  buyerName: string | null;
  department: string | null;
  amount: number | null;
  currency: string | null;
  datePublished: string | null;
  enquiryEnd: string | null;
  category: string | null;
  profileName: string | null;
}
