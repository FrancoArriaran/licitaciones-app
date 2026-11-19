import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  /** Secret key (sb_secret_...) or the legacy service_role key. Bypasses RLS: server only. */
  SUPABASE_SECRET_KEY: z.string().min(20),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  /** Suggests rubros from the client's business description. */
  OPENAI_API_KEY: z.string().min(20),
});

export const serverEnv = serverSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
