import type { OrganizationId, UserId } from "../accounts";
import type { AlertProfileDraft } from "./domain/profile";

export type AlertProfileId = string;

export interface CatalogFamily {
  readonly code: string;
  readonly description: string;
}

/** The UNSPSC families that appear in SEACE data: the closed vocabulary for profiles. */
export interface FamilyCatalog {
  all(): Promise<CatalogFamily[]>;
  existing(codes: readonly string[]): Promise<string[]>;
}

/** Maps a business description in plain words to catalog families (an LLM today). */
export interface CategorySuggester {
  suggest(
    description: string,
    catalog: readonly CatalogFamily[],
  ): Promise<{ families: string[]; reasoning: string }>;
}

export interface AlertProfileRepository {
  /** maxProfiles null means unlimited. */
  quota(organizationId: OrganizationId): Promise<{ maxProfiles: number | null; used: number }>;
  create(
    organizationId: OrganizationId,
    profile: AlertProfileDraft,
    createdBy: UserId,
  ): Promise<AlertProfileId>;
  /** Returns false when the profile doesn't exist in that organization. */
  update(
    organizationId: OrganizationId,
    id: AlertProfileId,
    profile: AlertProfileDraft,
  ): Promise<boolean>;
}

export interface NotificationSettings {
  readonly emailEnabled: boolean;
  readonly whatsappEnabled: boolean;
  readonly whatsappPhone: string | null;
  readonly whatsappOptInAt: Date | null;
  readonly digestHour: number;
}

export interface NotificationSettingsRepository {
  save(organizationId: OrganizationId, settings: NotificationSettings): Promise<void>;
}
