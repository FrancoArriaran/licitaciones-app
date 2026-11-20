import { SyncTenders } from "@licitaciones/core/ingestion";
import { SendWhatsAppAlerts } from "@licitaciones/core/notifications";
import {
  createServiceRoleClient,
  MetaWhatsAppSender,
  SeaceProcurementSource,
  SupabaseBidResultDetector,
  SupabaseMatchRefresher,
  SupabasePendingWhatsAppAlerts,
  SupabaseSyncRunLog,
  SupabaseTenderWriter,
  systemClock,
} from "@licitaciones/infra";
import { supabaseEnv, whatsAppEnv } from "./env";

/** The only place in the jobs that knows concrete implementations. */
function database() {
  const env = supabaseEnv();
  return createServiceRoleClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
}

export function syncTenders() {
  const db = database();
  return new SyncTenders(
    new SeaceProcurementSource(),
    new SupabaseTenderWriter(db),
    new SupabaseMatchRefresher(db),
    new SupabaseSyncRunLog(db),
    new SupabaseBidResultDetector(db),
    systemClock,
  );
}

export function sendWhatsAppAlerts({ dryRun }: { dryRun: boolean }) {
  const pending = new SupabasePendingWhatsAppAlerts(database());
  // A dry run needs no Meta credentials: it never sends.
  const sender = dryRun
    ? {
        sendTemplate: () => Promise.reject(new Error("dry run")),
      }
    : new MetaWhatsAppSender({
        accessToken: whatsAppEnv().WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: whatsAppEnv().WHATSAPP_PHONE_NUMBER_ID,
      });
  return new SendWhatsAppAlerts(pending, sender, systemClock);
}
