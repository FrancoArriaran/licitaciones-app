import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

/** POST only, so a link or image on another site can't sign people out. */
export async function POST(request: NextRequest) {
  const db = await createUserClient();
  await db.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
