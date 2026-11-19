import { canManageOrganizationSettings, type Actor, type OrganizationId } from "../../accounts";
import {
  NotAuthorizedError,
  NotFoundError,
  parseInput,
  ValidationError,
  type UntrustedInput,
} from "../../shared";
import { ProfileLimitReachedError } from "../domain/errors";
import { alertProfileSchema, type AlertProfileInput } from "../domain/profile";
import type { AlertProfileId, AlertProfileRepository, FamilyCatalog } from "../ports";

/** Creates a profile (within the plan's limit) or updates an existing one. */
export class SaveAlertProfile {
  constructor(
    private readonly profiles: AlertProfileRepository,
    private readonly catalog: FamilyCatalog,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    input: UntrustedInput<AlertProfileInput>,
    profileId?: AlertProfileId,
  ): Promise<AlertProfileId> {
    if (!canManageOrganizationSettings(actor)) throw new NotAuthorizedError();
    const profile = parseInput(alertProfileSchema, input);

    const known = new Set(await this.catalog.existing(profile.families));
    if (profile.families.some((code) => !known.has(code))) {
      throw new ValidationError("Revisa los datos marcados en el formulario.", {
        families: ["Una de las categorías ya no está disponible. Quítala y elige otra."],
      });
    }

    if (profileId) {
      const updated = await this.profiles.update(organizationId, profileId, profile);
      if (!updated) throw new NotFoundError("No encontramos ese perfil de alertas.");
      return profileId;
    }

    const { maxProfiles, used } = await this.profiles.quota(organizationId);
    if (maxProfiles !== null && used >= maxProfiles)
      throw new ProfileLimitReachedError(maxProfiles);
    return this.profiles.create(organizationId, profile, actor.userId);
  }
}
