import { NextResponse, type NextRequest } from "next/server";
import {
  LOGIN_ERROR_PARAM,
  LOGIN_ERROR_VALUE,
  LOGIN_PATH,
  POST_LOGIN_PATH,
} from "@/lib/auth/constants";
import { isAllowedEmail } from "@/lib/auth/is-allowed-email";
import {
  POST_LOGIN_NEXT_COOKIE,
  parsePostLoginNext,
  postLoginNextCookieOptions,
} from "@/lib/auth/post-login-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseAuthCallbackQuery } from "@/lib/validation/auth-callback";

/** Every exit clears the one-shot post-login cookie, so a target never outlives its sign-in. */
function redirectClearingNext(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.set(POST_LOGIN_NEXT_COOKIE, "", postLoginNextCookieOptions(0));
  return response;
}

/**
 * OAuth (PKCE) callback: exchanges `code` for a session cookie, then redirects to the post-login
 * page, or to the Kudo stored by the sign-in action when the cookie still passes the allow-list.
 * GET from Supabase's cross-site redirect, so no Origin check; the verifier cookie set by the
 * sign-in action binds the flow to this browser. Query params other than `code`/`error` are ignored.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const loginError = new URL(LOGIN_PATH, origin);
  loginError.searchParams.set(LOGIN_ERROR_PARAM, LOGIN_ERROR_VALUE);

  const query = parseAuthCallbackQuery(request.nextUrl.searchParams);
  if (!query) return redirectClearingNext(loginError);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(query.code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed", error);
      return redirectClearingNext(loginError);
    }
    // Defense in depth: the DB rejects new non-domain users, but accounts created before the
    // gate can still complete OAuth. Drop their session and show the generic error.
    if (!isAllowedEmail(data.user?.email)) {
      console.error("[auth/callback] rejected sign-in: email domain not allowed");
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) console.error("[auth/callback] signOut failed", signOutError);
      return redirectClearingNext(loginError);
    }
  } catch (err) {
    console.error("[auth/callback] unexpected failure", err);
    return redirectClearingNext(loginError);
  }

  // Re-checked here: the cookie is client-held, so it is untrusted input like any other.
  const next = parsePostLoginNext(request.cookies.get(POST_LOGIN_NEXT_COOKIE)?.value);
  return redirectClearingNext(new URL(next ?? POST_LOGIN_PATH, origin));
}
