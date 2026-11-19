import { existsSync } from "node:fs";
import { z } from "zod";

// Local runs read apps/jobs/.env.local; in GitHub Actions the variables come from secrets.
const localEnvFile = new URL("../.env.local", import.meta.url);
if (existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);

const supabaseSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

const whatsAppSchema = z.object({
  WHATSAPP_ACCESS_TOKEN: z.string().min(20),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/, "must be the numeric id from Meta"),
});

/** Fails with the names of missing variables only, never their values. */
function read<S extends z.ZodObject>(schema: S): z.output<S> {
  const result = schema.safeParse(process.env);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
  throw new Error(`Missing or invalid environment variables: ${names.join(", ")}`);
}

export const supabaseEnv = () => read(supabaseSchema);
export const whatsAppEnv = () => read(whatsAppSchema);
