import type { CaptchaVerifier } from "@licitaciones/core/marketing";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare Turnstile. In local development use Cloudflare's published test keys
 * (see .env.example), which always pass, so the real code path runs everywhere.
 */
export class TurnstileCaptchaVerifier implements CaptchaVerifier {
  constructor(
    private readonly secretKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async verify(token: string, ip: string | null): Promise<boolean> {
    if (!token) return false;
    const body = new URLSearchParams({ secret: this.secretKey, response: token });
    if (ip) body.set("remoteip", ip);

    const response = await this.fetchFn(SITEVERIFY_URL, { method: "POST", body });
    if (!response.ok) throw new Error(`Turnstile siteverify returned HTTP ${response.status}`);
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  }
}
