import type { WhatsAppSender, WhatsAppTemplateMessage } from "@licitaciones/core/notifications";

export interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  /** Approved template. Defaults match the n8n workflow. */
  templateName?: string;
  /** Language the template was registered with in Meta ("en" for `licitacion_nueva`). */
  templateLanguage?: string;
}

const GRAPH_URL = "https://graph.facebook.com/v22.0";

/** WhatsApp Cloud API (Meta), the same call the n8n "Enviar WhatsApp" node made. */
export class MetaWhatsAppSender implements WhatsAppSender {
  constructor(
    private readonly config: MetaWhatsAppConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async sendTemplate({ to, bodyParams }: WhatsAppTemplateMessage) {
    const response = await this.fetchFn(`${GRAPH_URL}/${this.config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: this.config.templateName ?? "licitacion_nueva",
          language: { code: this.config.templateLanguage ?? "en" },
          components: [
            { type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) },
          ],
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return;

    // Meta's error text says what's wrong (expired token, template not approved...).
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string; code?: number };
    } | null;
    const detail = payload?.error
      ? `${payload.error.code ?? ""} ${payload.error.message ?? ""}`.trim()
      : "";
    throw new Error(`WhatsApp returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}
