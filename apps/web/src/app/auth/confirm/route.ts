import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createUserClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: readonly string[] = ["invite", "recovery", "email", "magiclink"];

function isAllowedType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_TYPES.includes(value);
}

/** Target of the links in supabase/templates/*.html: verifies the token and starts the session. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"), "/inicio");

  if (tokenHash && isAllowedType(type)) {
    const db = await createUserClient();
    const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=enlace", request.url));
}
