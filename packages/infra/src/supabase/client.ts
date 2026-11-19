import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type DbClient = SupabaseClient<Database>;

/**
 * Bypasses RLS. Only for server code that must act outside a user's permissions
 * (auth admin API, writing captcha-checked leads). Never import from client components.
 */
export function createServiceRoleClient(url: string, serviceRoleKey: string): DbClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type SupabaseResult = { data: unknown; error: { message: string; code?: string } | null };

/** Data type of the success branch: Row for .single(), Row | null for .maybeSingle(), Row[] for lists. */
type SuccessData<R> = R extends { error: null; data: infer D } ? D : never;

/** Turns a Supabase error into a thrown Error with the operation name for logs and Sentry. */
export function unwrap<R extends SupabaseResult>(operation: string, result: R): SuccessData<R> {
  if (result.error) {
    throw new Error(
      `${operation} failed: ${result.error.code ?? ""} ${result.error.message}`.trim(),
    );
  }
  return result.data as SuccessData<R>;
}
