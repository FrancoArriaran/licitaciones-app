import type { MatchSource, PendingWhatsAppAlert } from "./domain/tender-alert";

/** Matches not yet notified, for organizations and prototype profiles with WhatsApp on. */
export interface PendingWhatsAppAlerts {
  list(): Promise<PendingWhatsAppAlert[]>;
  /** Marks matches as sent so they're never sent again. */
  markNotified(source: MatchSource, matchIds: readonly number[], at: Date): Promise<void>;
}

export interface WhatsAppTemplateMessage {
  to: string;
  /** Values for the template body placeholders, in order. */
  bodyParams: string[];
}

export interface WhatsAppSender {
  /** Resolves once the provider accepted the message; throws otherwise. */
  sendTemplate(message: WhatsAppTemplateMessage): Promise<void>;
}
