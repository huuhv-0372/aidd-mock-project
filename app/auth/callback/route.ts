import { NextResponse, type NextRequest } from "next/server";
import {
  LOGIN_ERROR_PARAM,
  LOGIN_ERROR_VALUE,
  LOGIN_PATH,
  POST_LOGIN_PATH,
} from "@/lib/auth/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseAuthCallbackQuery } from "@/lib/validation/auth-callback";

/**
 * OAuth (PKCE) callback: exchanges `code` for a session cookie, then redirects to a constant
 * target. GET from Supabase's cross-site redirect, so no Origin check; the verifier cookie
 * set by the sign-in action binds the flow to this browser.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const loginError = new URL(LOGIN_PATH, origin);
  loginError.searchParams.set(LOGIN_ERROR_PARAM, LOGIN_ERROR_VALUE);

  const query = parseAuthCallbackQuery(request.nextUrl.searchParams);
  if (!query) return NextResponse.redirect(loginError);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(query.code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed", error);
      return NextResponse.redirect(loginError);
    }
  } catch (err) {
    console.error("[auth/callback] unexpected failure", err);
    return NextResponse.redirect(loginError);
  }

  return NextResponse.redirect(new URL(POST_LOGIN_PATH, origin));
}
