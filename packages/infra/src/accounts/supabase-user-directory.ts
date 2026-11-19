import {
  EmailAlreadyRegisteredError,
  type InvitationLink,
  type UserDirectory,
  type UserId,
} from "@licitaciones/core/accounts";
import type { DbClient } from "../supabase/client";

/**
 * Needs the service-role client: the auth admin API is not available to regular users.
 * Links are generated, not emailed, so invitations work before SMTP is configured; the
 * caller decides how to deliver them. They point to our /auth/confirm route, which
 * verifies the token server-side and sets the session cookie.
 */
export class SupabaseUserDirectory implements UserDirectory {
  constructor(
    private readonly admin: DbClient,
    private readonly siteUrl: string,
  ) {}

  async invite(email: string): Promise<{ userId: UserId; invitationLink: InvitationLink }> {
    const { data, error } = await this.admin.auth.admin.generateLink({ type: "invite", email });
    if (error) {
      if (error.code === "email_exists") throw new EmailAlreadyRegisteredError();
      throw new Error(`auth.generateLink(invite) failed: ${error.message}`);
    }
    return {
      userId: data.user.id as UserId,
      invitationLink: this.confirmUrl(data.properties.hashed_token, "invite"),
    };
  }

  async createAccessLink(email: string): Promise<InvitationLink> {
    const { data, error } = await this.admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw new Error(`auth.generateLink(magiclink) failed: ${error.message}`);
    return this.confirmUrl(data.properties.hashed_token, "magiclink");
  }

  async remove(userId: UserId): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`auth.deleteUser failed: ${error.message}`);
  }

  private confirmUrl(tokenHash: string, type: "invite" | "magiclink"): InvitationLink {
    const url = new URL("/auth/confirm", this.siteUrl);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", type);
    url.searchParams.set("next", "/bienvenida");
    return url.toString();
  }
}
