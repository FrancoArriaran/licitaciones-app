import type { Ruc } from "../shared";

export interface Lead {
  readonly fullName: string;
  readonly companyName: string;
  readonly ruc: Ruc | null;
  readonly jobTitle: string | null;
  readonly email: string;
  readonly phone: string;
  readonly sector: string;
  readonly sellsToGovernment: "yes" | "no" | "not_sure";
  readonly source: "demo_form";
  readonly createdAt: Date;
}

export const LEAD_STATUSES = ["new", "contacted", "demo_scheduled", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface LeadRepository {
  save(lead: Lead): Promise<void>;
}

export interface LeadPipeline {
  updateStatus(leadId: string, status: LeadStatus): Promise<void>;
}

export interface CaptchaVerifier {
  verify(token: string, ip: string | null): Promise<boolean>;
}
