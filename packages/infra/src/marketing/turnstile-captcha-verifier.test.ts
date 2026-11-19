import { describe, expect, it, vi } from "vitest";
import { TurnstileCaptchaVerifier } from "./turnstile-captcha-verifier";

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

describe("TurnstileCaptchaVerifier", () => {
  it("sends secret, token and IP and trusts only success: true", async () => {
    const fetchFn = fakeFetch({ success: true });
    const verifier = new TurnstileCaptchaVerifier("secret", fetchFn);

    await expect(verifier.verify("token", "190.0.0.1")).resolves.toBe(true);
    const [, init] = vi.mocked(fetchFn).mock.calls[0] as unknown as [string, RequestInit];
    const sent = init.body as URLSearchParams;
    expect(Object.fromEntries(sent)).toEqual({
      secret: "secret",
      response: "token",
      remoteip: "190.0.0.1",
    });
  });

  it("rejects failed challenges and empty tokens without calling Cloudflare", async () => {
    const fetchFn = fakeFetch({ success: false });
    const verifier = new TurnstileCaptchaVerifier("secret", fetchFn);

    await expect(verifier.verify("token", null)).resolves.toBe(false);
    await expect(verifier.verify("", null)).resolves.toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("throws when Cloudflare is unavailable so the error reaches monitoring", async () => {
    const verifier = new TurnstileCaptchaVerifier("secret", fakeFetch({}, 503));
    await expect(verifier.verify("token", null)).rejects.toThrow("HTTP 503");
  });
});
