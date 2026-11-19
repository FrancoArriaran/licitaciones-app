import "server-only";
import {
  AcceptInvitations,
  CreateOrganization,
  InviteMember,
  RemoveMember,
  RenewInvitationLink,
  UpdateSubscription,
} from "@licitaciones/core/accounts";
import {
  SaveAlertProfile,
  SaveNotificationSettings,
  SuggestCategories,
} from "@licitaciones/core/alerts";
import { SubmitDemoRequest, UpdateLeadStatus } from "@licitaciones/core/marketing";
import {
  OpenAiCategorySuggester,
  SupabaseAlertProfileRepository,
  SupabaseFamilyCatalog,
  SupabaseLeadPipeline,
  SupabaseLeadRepository,
  SupabaseMembershipRepository,
  SupabaseNotificationSettingsRepository,
  SupabaseOrganizationRepository,
  SupabaseUserDirectory,
  systemClock,
  TurnstileCaptchaVerifier,
} from "@licitaciones/infra";
import { publicEnv } from "./env";
import { serverEnv } from "./server-env";
import { getDb } from "./session";
import { createAdminClient } from "./supabase/server";

/** Composition root: the only place in the web app that picks concrete adapters. */

export async function accountsUseCases() {
  const db = await getDb();
  const organizations = new SupabaseOrganizationRepository(db);
  const memberships = new SupabaseMembershipRepository(db);
  const users = new SupabaseUserDirectory(createAdminClient(), publicEnv.NEXT_PUBLIC_SITE_URL);
  return {
    createOrganization: new CreateOrganization(organizations, systemClock),
    inviteMember: new InviteMember(organizations, memberships, users),
    renewInvitationLink: new RenewInvitationLink(memberships, users),
    removeMember: new RemoveMember(memberships, users),
    updateSubscription: new UpdateSubscription(organizations),
    acceptInvitations: new AcceptInvitations(memberships),
  };
}

export async function alertsUseCases() {
  const db = await getDb();
  const catalog = new SupabaseFamilyCatalog(db);
  return {
    suggestCategories: new SuggestCategories(
      catalog,
      new OpenAiCategorySuggester(serverEnv.OPENAI_API_KEY),
    ),
    saveAlertProfile: new SaveAlertProfile(new SupabaseAlertProfileRepository(db), catalog),
    saveNotificationSettings: new SaveNotificationSettings(
      new SupabaseNotificationSettingsRepository(db),
      systemClock,
    ),
  };
}

export async function marketingUseCases() {
  const db = await getDb();
  return {
    submitDemoRequest: new SubmitDemoRequest(
      new SupabaseLeadRepository(createAdminClient()),
      new TurnstileCaptchaVerifier(serverEnv.TURNSTILE_SECRET_KEY),
      systemClock,
    ),
    updateLeadStatus: new UpdateLeadStatus(new SupabaseLeadPipeline(db)),
  };
}
