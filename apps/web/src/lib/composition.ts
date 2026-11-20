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
import {
  AddBidNote,
  BidDocuments,
  FollowOpportunity,
  RemoveBid,
  UpdateBid,
} from "@licitaciones/core/bids";
import { SubmitDemoRequest, UpdateLeadStatus } from "@licitaciones/core/marketing";
import {
  OpenAiCategorySuggester,
  randomIds,
  SupabaseAlertProfileRepository,
  SupabaseBidDocumentRepository,
  SupabaseBidRepository,
  SupabaseBidTimeline,
  SupabaseFileStorage,
  SupabaseTeamDirectory,
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

export async function bidsUseCases() {
  const db = await getDb();
  const bids = new SupabaseBidRepository(db);
  const timeline = new SupabaseBidTimeline(db);
  return {
    followOpportunity: new FollowOpportunity(bids, timeline),
    updateBid: new UpdateBid(bids, timeline, new SupabaseTeamDirectory(db)),
    addNote: new AddBidNote(bids, timeline),
    removeBid: new RemoveBid(bids),
    documents: new BidDocuments(
      bids,
      new SupabaseBidDocumentRepository(db),
      timeline,
      new SupabaseFileStorage(db),
      randomIds,
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
