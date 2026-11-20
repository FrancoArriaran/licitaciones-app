"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@licitaciones/infra/database-types";
import { publicEnv } from "../env";

/**
 * Browser client, used only to send files to Storage with a signed upload URL that
 * the server already authorized. Reads and writes of data go through Server Actions.
 */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
