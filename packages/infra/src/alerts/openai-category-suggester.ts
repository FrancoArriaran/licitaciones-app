import type { CatalogFamily, CategorySuggester } from "@licitaciones/core/alerts";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/** Same instructions that worked in the n8n onboarding prototype, with a strict JSON schema. */
function buildPrompt(description: string, catalog: readonly CatalogFamily[]): string {
  const lines = catalog.map((family) => `${family.code} - ${family.description}`).join("\n");
  return `Eres un clasificador que mapea la descripción de una empresa peruana a categorías UNSPSC (a nivel de familia, 4 dígitos) usadas en licitaciones públicas del Perú.

Descripción de la empresa:
"""
${description}
"""

Elige entre 1 y 6 familias de la siguiente lista (formato: código - descripción) que mejor representen lo que esta empresa podría ofertar en una licitación pública. Solo usa códigos que aparecen en la lista; no inventes ninguno. Ordénalas de la más a la menos relevante.

${lines}

En "reasoning" explica en una o dos frases, en español y en lenguaje sencillo, por qué elegiste esas categorías.`;
}

const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "category_suggestion",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["families", "reasoning"],
      properties: {
        families: { type: "array", items: { type: "string" } },
        reasoning: { type: "string" },
      },
    },
  },
} as const;

export class OpenAiCategorySuggester implements CategorySuggester {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gpt-4o-mini",
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async suggest(description: string, catalog: readonly CatalogFamily[]) {
    const response = await this.fetchFn(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: RESPONSE_FORMAT,
        messages: [{ role: "user", content: buildPrompt(description, catalog) }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty answer");

    const parsed = JSON.parse(content) as { families?: unknown; reasoning?: unknown };
    return {
      families: Array.isArray(parsed.families)
        ? parsed.families.filter((code): code is string => typeof code === "string")
        : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  }
}
