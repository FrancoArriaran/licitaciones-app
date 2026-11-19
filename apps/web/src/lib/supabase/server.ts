import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient, type Database, type DbClient } from "@licitaciones/infra";
import { cookies } from "next/headers";
import { publicEnv } from "../env";
import { serverEnv } from "../server-env";

/** Client acting as the signed-in user: every query goes through RLS. */
export async function createUserClient(): Promise<DbClient> {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't write cookies. The proxy already refreshed the
            // session for this request, so there is nothing to persist here.
          }
        },
      },
    },
  );
}

/** Bypasses RLS. Only for the auth admin API and captcha-checked public writes. */
export function createAdminClient(): DbClient {
  return createServiceRoleClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY);
}
