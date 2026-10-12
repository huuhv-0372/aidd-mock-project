import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveAuthRedirect } from "@/lib/auth/resolve-auth-redirect";
import { resolveGateRedirect } from "@/lib/countdown/resolve-gate-redirect";
import { getEventStartAt, isEventLaunched } from "@/lib/event/get-event-start-at";
import { redirectWithSession, updateSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  const launched = isEventLaunched(getEventStartAt(), Date.now());
  const target = resolveGateRedirect(request.nextUrl.pathname, launched);
  // Gate returns early; CSP nonce / Supabase session logic composes after this point.
  if (target) return NextResponse.redirect(new URL(target, request.url), 307);

  const { response, isAuthenticated } = await updateSession(request);
  const authTarget = resolveAuthRedirect(request.nextUrl.pathname, isAuthenticated);
  if (authTarget) return redirectWithSession(response, new URL(authTarget, request.url));
  return response;
}

export const config = {
  // Skip only Next internals and known public asset paths. A generic "has a file extension" rule
  // would let future dotted routes (/users/a.b, /api/x.csv) bypass the gate.
  matcher: ["/((?!_next/static|_next/image|images/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
