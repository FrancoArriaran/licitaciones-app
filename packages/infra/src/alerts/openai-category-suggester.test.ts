import { describe, expect, it, vi } from "vitest";
import { OpenAiCategorySuggester } from "./openai-category-suggester";

const catalog = [
  { code: "3011", description: "Concreto, cemento y yeso" },
  { code: "3010", description: "Componentes estructurales" },
];

function fakeFetch(content: string | null, status = 200) {
  return vi.fn(
    async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status }),
  ) as unknown as typeof fetch;
}

describe("OpenAiCategorySuggester", () => {
  it("sends the description and catalog, and parses the structured answer", async () => {
    const fetchFn = fakeFetch(
      JSON.stringify({ families: ["3011", 42], reasoning: "Vende cemento." }),
    );
    const suggester = new OpenAiCategorySuggester("test-key", "gpt-4o-mini", fetchFn);

    const result = await suggester.suggest("Vendemos cemento en Arequipa", catalog);

    expect(result).toEqual({ families: ["3011"], reasoning: "Vende cemento." });
    const [, init] = vi.mocked(fetchFn).mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
    expect(body.messages[0]?.content).toContain("Vendemos cemento en Arequipa");
    expect(body.messages[0]?.content).toContain("3011 - Concreto, cemento y yeso");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
  });

  it("throws on HTTP errors and empty answers so the failure is visible", async () => {
    await expect(
      new OpenAiCategorySuggester("k", "m", fakeFetch(null, 500)).suggest("x", catalog),
    ).rejects.toThrow("HTTP 500");
    await expect(
      new OpenAiCategorySuggester("k", "m", fakeFetch(null)).suggest("x", catalog),
    ).rejects.toThrow("empty answer");
  });
});
