import type { Clock } from "@licitaciones/core/shared";

export { SupabaseMembershipRepository } from "./accounts/supabase-membership-repository";
export { SupabaseOrganizationRepository } from "./accounts/supabase-organization-repository";
export { SupabaseUserDirectory } from "./accounts/supabase-user-directory";
export { OpenAiCategorySuggester } from "./alerts/openai-category-suggester";
export {
  SupabaseAlertProfileRepository,
  SupabaseFamilyCatalog,
  SupabaseNotificationSettingsRepository,
} from "./alerts/supabase-alert-repositories";
export {
  SupabaseBidDocumentRepository,
  SupabaseBidRepository,
  SupabaseBidTimeline,
  SupabaseSeaceHistory,
  SupabaseTeamDirectory,
} from "./bids/supabase-bid-repositories";
export { SupabaseFileStorage } from "./storage/supabase-file-storage";
export { SeaceProcurementSource } from "./ingestion/seace-procurement-source";
export {
  SupabaseBidResultDetector,
  SupabaseMatchRefresher,
  SupabaseSyncRunLog,
  SupabaseTenderWriter,
} from "./ingestion/supabase-ingestion-repositories";
export { MetaWhatsAppSender, type MetaWhatsAppConfig } from "./notifications/meta-whatsapp-sender";
export { SupabasePendingWhatsAppAlerts } from "./notifications/supabase-pending-whatsapp-alerts";
export { SupabaseLeadPipeline } from "./marketing/supabase-lead-pipeline";
export { SupabaseLeadRepository } from "./marketing/supabase-lead-repository";
export { TurnstileCaptchaVerifier } from "./marketing/turnstile-captcha-verifier";
export { createServiceRoleClient, unwrap, type DbClient } from "./supabase/client";
export type { Database } from "./supabase/database.types";

export const systemClock: Clock = { now: () => new Date() };

export const randomIds = { uuid: () => crypto.randomUUID() };
