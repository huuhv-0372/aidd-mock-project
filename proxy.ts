import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveAuthRedirect } from "@/lib/auth/resolve-auth-redirect";
import { resolveGateRedirect } from "@/lib/countdown/resolve-gate-redirect";
import { getEventStartAt, isEventLaunched } from "@/lib/event/get-event-start-at";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { resolveLocaleRewrite } from "@/lib/i18n/resolve-locale-rewrite";
import {
  redirectWithSession,
  rewriteWithSession,
  updateSession,
} from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const launched = isEventLaunched(getEventStartAt(), Date.now());
  const target = resolveGateRedirect(pathname, launched);
  // Gate returns early; CSP nonce / Supabase session logic composes after this point.
  if (target) return NextResponse.redirect(new URL(target, request.url), 307);

  const { response, isAuthenticated } = await updateSession(request);
  const authTarget = resolveAuthRedirect(pathname, isAuthenticated);
  if (authTarget) return redirectWithSession(response, new URL(authTarget, request.url));

  // Gate and auth decide on the public path; only then serve it from the hidden app/[locale] tree.
  const localized = resolveLocaleRewrite(pathname, request.cookies.get(LOCALE_COOKIE)?.value);
  if (!localized) return response;
  const url = request.nextUrl.clone();
  url.pathname = localized;
  return rewriteWithSession(request, response, url);
}

export const config = {
  // Skip only Next internals and known public asset paths. A generic "has a file extension" rule
  // would let future dotted routes (/users/a.b, /api/x.csv) bypass the gate.
  matcher: ["/((?!_next/static|_next/image|images/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
