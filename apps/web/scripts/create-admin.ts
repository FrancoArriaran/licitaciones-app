/**
 * Creates (or promotes) an internal administrator and prints a one-time link to
 * set their password. Works without email delivery configured: the link is
 * generated, not mailed.
 *
 * Usage (from the repo root): pnpm admin:create persona@empresa.pe
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and NEXT_PUBLIC_SITE_URL
 * from apps/web/.env.local.
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase() ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Indica el correo del administrador: pnpm admin:create persona@empresa.pe");
  process.exit(1);
}

process.loadEnvFile(".env.local");
const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !NEXT_PUBLIC_SITE_URL) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o NEXT_PUBLIC_SITE_URL en apps/web/.env.local.",
  );
  process.exit(1);
}

const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// New person: an invite link. Existing account: a password-reset link instead.
let type: "invite" | "recovery" = "invite";
let result = await admin.auth.admin.generateLink({ type: "invite", email });
if (result.error?.code === "email_exists") {
  type = "recovery";
  result = await admin.auth.admin.generateLink({ type: "recovery", email });
}
if (result.error) {
  console.error(`No se pudo generar el enlace: ${result.error.message}`);
  process.exit(1);
}

const { user, properties } = result.data;
const promoted = await admin
  .from("platform_admins")
  .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
if (promoted.error) {
  console.error(`No se pudo dar permisos de administrador: ${promoted.error.message}`);
  process.exit(1);
}

const next = type === "invite" ? "/bienvenida" : "/nueva-contrasena";
const link = new URL("/auth/confirm", NEXT_PUBLIC_SITE_URL);
link.searchParams.set("token_hash", properties.hashed_token);
link.searchParams.set("type", type);
link.searchParams.set("next", next);

console.log(`\n${email} ya es administrador.`);
console.log("Abre este enlace para crear la contraseña (vence en 24 horas, un solo uso):\n");
console.log(link.toString());
console.log("\nLuego entra a /admin para registrar empresas.\n");
