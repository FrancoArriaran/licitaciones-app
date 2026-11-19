import { describe, expect, it } from "vitest";
import { MetaWhatsAppSender } from "./meta-whatsapp-sender";

function fakeFetch(response: Response) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return response;
  }) as typeof fetch;
  return { fetchFn, calls };
}

const config = { accessToken: "test-token-not-real-123456", phoneNumberId: "123456789" };

describe("MetaWhatsAppSender", () => {
  it("sends the same body the n8n workflow sent", async () => {
    const { fetchFn, calls } = fakeFetch(Response.json({ messages: [{ id: "wamid.1" }] }));

    await new MetaWhatsAppSender(config, fetchFn).sendTemplate({
      to: "+51987654321",
      bodyParams: ["Empresa", "SIE-1", "Municipalidad", "45,000.00", "20/11/2026"],
    });

    expect(calls[0]?.url).toBe("https://graph.facebook.com/v22.0/123456789/messages");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "+51987654321",
      type: "template",
      template: {
        name: "licitacion_nueva",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: ["Empresa", "SIE-1", "Municipalidad", "45,000.00", "20/11/2026"].map(
              (text) => ({ type: "text", text }),
            ),
          },
        ],
      },
    });
  });

  it("throws with Meta's explanation when the message is rejected", async () => {
    const { fetchFn } = fakeFetch(
      Response.json({ error: { code: 190, message: "Access token has expired" } }, { status: 401 }),
    );
    await expect(
      new MetaWhatsAppSender(config, fetchFn).sendTemplate({ to: "+51900000000", bodyParams: [] }),
    ).rejects.toThrow("WhatsApp returned HTTP 401: 190 Access token has expired");
  });
});
