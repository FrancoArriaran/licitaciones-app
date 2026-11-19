import { z } from "zod";
import { canManageOrganizationSettings, type Actor } from "../../accounts";
import { NotAuthorizedError, parseInput, type UntrustedInput } from "../../shared";
import { NoSuggestionsError } from "../domain/errors";
import type { CatalogFamily, CategorySuggester, FamilyCatalog } from "../ports";

const MAX_SUGGESTIONS = 6;

const suggestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Cuéntanos qué vende tu empresa en al menos una frase.")
    .max(1000, "Máximo 1000 caracteres."),
});

/**
 * The client describes their business in plain words; we propose catalog families
 * they then confirm. Only codes that exist in the catalog survive, whatever the
 * suggester returns.
 */
export class SuggestCategories {
  constructor(
    private readonly catalog: FamilyCatalog,
    private readonly suggester: CategorySuggester,
  ) {}

  async execute(
    actor: Actor,
    input: UntrustedInput<z.input<typeof suggestSchema>>,
  ): Promise<{ families: CatalogFamily[]; reasoning: string }> {
    if (!canManageOrganizationSettings(actor)) throw new NotAuthorizedError();
    const { description } = parseInput(suggestSchema, input);

    const families = await this.catalog.all();
    const byCode = new Map(families.map((family) => [family.code, family]));
    const result = await this.suggester.suggest(description, families);

    const valid = [...new Set(result.families)]
      .map((code) => byCode.get(code))
      .filter((family): family is CatalogFamily => family !== undefined)
      .slice(0, MAX_SUGGESTIONS);
    if (valid.length === 0) throw new NoSuggestionsError();

    return { families: valid, reasoning: result.reasoning };
  }
}
