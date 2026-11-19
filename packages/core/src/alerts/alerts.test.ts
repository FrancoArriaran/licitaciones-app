import { describe, expect, it } from "vitest";
import type { Actor, OrganizationId, UserId } from "../accounts";
import { NotAuthorizedError, ValidationError, type Clock } from "../shared";
import {
  NoSuggestionsError,
  ProfileLimitReachedError,
  SaveAlertProfile,
  SaveNotificationSettings,
  SuggestCategories,
  type AlertProfileDraft,
  type AlertProfileRepository,
  type CatalogFamily,
  type CategorySuggester,
  type FamilyCatalog,
  type NotificationSettings,
} from "./index";

const NOW = new Date("2026-11-18T12:00:00Z");
const clock: Clock = { now: () => NOW };
const ORG = "org-a" as OrganizationId;
const owner: Actor = { userId: "u-owner" as UserId, isPlatformAdmin: false, role: "owner" };
const member: Actor = { userId: "u-member" as UserId, isPlatformAdmin: false, role: "member" };

const CATALOG: CatalogFamily[] = [
  { code: "3011", description: "Concreto, cemento y yeso" },
  { code: "3010", description: "Componentes estructurales" },
  { code: "4321", description: "Computadores" },
];

const catalog: FamilyCatalog = {
  all: async () => CATALOG,
  existing: async (codes) => codes.filter((code) => CATALOG.some((f) => f.code === code)),
};

function suggester(families: string[]): CategorySuggester {
  return { suggest: async () => ({ families, reasoning: "Vende materiales de construcción." }) };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (rejection: unknown) => rejection,
  );
}

describe("SuggestCategories", () => {
  it("keeps only catalog codes, without duplicates, with their descriptions", async () => {
    const useCase = new SuggestCategories(catalog, suggester(["3011", "9999", "3011", "3010"]));
    const result = await useCase.execute(owner, {
      description: "Vendemos cemento y fierro en Arequipa",
    });
    expect(result.families).toEqual([CATALOG[0], CATALOG[1]]);
  });

  it("explains when nothing usable came back", async () => {
    const useCase = new SuggestCategories(catalog, suggester(["9999"]));
    await expect(
      useCase.execute(owner, { description: "Vendemos cosas variadas para todos" }),
    ).rejects.toBeInstanceOf(NoSuggestionsError);
  });

  it("is for owners and admins", async () => {
    const useCase = new SuggestCategories(catalog, suggester(["3011"]));
    await expect(
      useCase.execute(member, { description: "Vendemos cemento y fierro en Arequipa" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

class InMemoryProfiles implements AlertProfileRepository {
  maxProfiles: number | null = 1;
  created: AlertProfileDraft[] = [];
  updated: string[] = [];
  async quota() {
    return { maxProfiles: this.maxProfiles, used: this.created.length };
  }
  async create(_org: OrganizationId, profile: AlertProfileDraft) {
    this.created.push(profile);
    return `p-${this.created.length}`;
  }
  async update(_org: OrganizationId, id: string) {
    this.updated.push(id);
    return id === "p-existing";
  }
}

const validProfile = {
  name: "Cemento Arequipa",
  businessDescription: "Vendemos cemento y agregados",
  families: ["3011", "3011", "3010"],
  departments: ["AREQUIPA", "PUNO"],
  minAmount: "",
  maxAmount: "100000",
};

describe("SaveAlertProfile", () => {
  it("creates a normalized profile", async () => {
    const profiles = new InMemoryProfiles();
    const id = await new SaveAlertProfile(profiles, catalog).execute(owner, ORG, validProfile);
    expect(id).toBe("p-1");
    expect(profiles.created[0]).toEqual({
      name: "Cemento Arequipa",
      businessDescription: "Vendemos cemento y agregados",
      families: ["3011", "3010"],
      departments: ["AREQUIPA", "PUNO"],
      minAmount: undefined,
      maxAmount: 100000,
      status: "active",
    });
  });

  it("enforces the plan's profile limit on creation, not on edits", async () => {
    const profiles = new InMemoryProfiles();
    const useCase = new SaveAlertProfile(profiles, catalog);
    await useCase.execute(owner, ORG, validProfile);
    await expect(useCase.execute(owner, ORG, validProfile)).rejects.toBeInstanceOf(
      ProfileLimitReachedError,
    );
    await expect(useCase.execute(owner, ORG, validProfile, "p-existing")).resolves.toBe(
      "p-existing",
    );
  });

  it("rejects unknown categories, unknown departments and inverted ranges", async () => {
    const useCase = new SaveAlertProfile(new InMemoryProfiles(), catalog);
    const unknownFamily = await errorOf(
      useCase.execute(owner, ORG, { ...validProfile, families: ["9999"] }),
    );
    expect((unknownFamily as ValidationError).fieldErrors).toHaveProperty("families");

    const badDepartment = await errorOf(
      useCase.execute(owner, ORG, { ...validProfile, departments: ["ATLANTIS"] }),
    );
    expect(badDepartment).toBeInstanceOf(ValidationError);

    const inverted = await errorOf(
      useCase.execute(owner, ORG, { ...validProfile, minAmount: "5000", maxAmount: "100" }),
    );
    expect((inverted as ValidationError).fieldErrors).toHaveProperty("maxAmount");
  });
});

describe("SaveNotificationSettings", () => {
  function setup() {
    const saved: NotificationSettings[] = [];
    const useCase = new SaveNotificationSettings(
      { save: async (_org, s) => void saved.push(s) },
      clock,
    );
    return { saved, useCase };
  }

  it("records the WhatsApp consent time and a normalized phone", async () => {
    const { saved, useCase } = setup();
    await useCase.execute(owner, ORG, {
      emailEnabled: "on",
      whatsappEnabled: "on",
      whatsappPhone: "987 654 321",
      whatsappConsent: "on",
      digestHour: "7",
    });
    expect(saved).toEqual([
      {
        emailEnabled: true,
        whatsappEnabled: true,
        whatsappPhone: "+51987654321",
        whatsappOptInAt: NOW,
        digestHour: 7,
      },
    ]);
  });

  it("requires phone and consent to turn WhatsApp on", async () => {
    const { useCase } = setup();
    const error = await errorOf(
      useCase.execute(owner, ORG, { whatsappEnabled: "on", digestHour: "7" }),
    );
    expect((error as ValidationError).fieldErrors).toHaveProperty("whatsappPhone");
    expect((error as ValidationError).fieldErrors).toHaveProperty("whatsappConsent");
  });
});
