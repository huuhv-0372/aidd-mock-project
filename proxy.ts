import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Site-wide navigation lock (F001 / D2).
 *
 * Reads NEXT_PUBLIC_EVENT_START_AT (ISO-8601) from env. Before that moment,
 * every route except "/" redirects to "/" so visitors land on the countdown
 * screen. At or after that moment, nothing is ever redirected (including "/"
 * itself, to avoid a self-redirect loop).
 *
 * Fails open on a missing or malformed env var: treat the event as already
 * started (no redirect) rather than risk locking the whole site behind a
 * config typo. A warning is logged server-side so the misconfiguration is
 * visible without breaking availability.
 */
export function proxy(request: NextRequest) {
  const rawTarget = process.env.NEXT_PUBLIC_EVENT_START_AT;
  const target = rawTarget ? new Date(rawTarget) : null;
  const isValidTarget = target !== null && !Number.isNaN(target.getTime());

  if (!isValidTarget) {
    if (rawTarget) {
      console.warn(
        `[proxy] NEXT_PUBLIC_EVENT_START_AT="${rawTarget}" is not a valid ISO-8601 datetime; failing open (site unlocked).`
      );
    } else {
      console.warn(
        "[proxy] NEXT_PUBLIC_EVENT_START_AT is not set; failing open (site unlocked)."
      );
    }
    return NextResponse.next();
  }

  const isBeforeEventStart = Date.now() < target.getTime();
  const isHomePath = request.nextUrl.pathname === "/";

  if (isBeforeEventStart && !isHomePath) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  return NextResponse.next();
}

// Excludes Next.js internals (_next/static, _next/image), favicon.ico, and
// common static asset extensions so the countdown page's own JS/CSS/image
// requests are never caught in the redirect loop.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff|woff2|ttf|otf)$).*)",
  ],
};
