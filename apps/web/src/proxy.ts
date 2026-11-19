import { createServerClient } from "@supabase/ssr";
import type { Database } from "@licitaciones/infra/database-types";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "./lib/env";

const PROTECTED_PREFIXES = [
  "/inicio",
  "/alertas",
  "/empresa",
  "/admin",
  "/bienvenida",
  "/nueva-contrasena",
];

/**
 * Refreshes the Supabase session cookie on every request and sends anonymous
 * visitors of private pages to the login. This is an optimistic check only:
 * pages and actions verify the session again in lib/session.ts.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!data?.claims && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
