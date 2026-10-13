// Web-API-only: shared by proxy.ts (via update-session) and Server Components.
import { isAuthSessionMissingError } from "@supabase/supabase-js";

/** The parts of a `getClaims()` result this check reads. */
type ClaimsResult = { data: { claims?: { sub?: string } } | null; error: unknown };

/**
 * Single definition of "signed in" for the proxy and the homepage header: verified claims with a
 * subject. A missing session is the normal guest case and stays silent; any other error is logged
 * under `tag` and counts as signed out.
 */
export function isSignedInClaims({ data, error }: ClaimsResult, tag: string): boolean {
  if (error) {
    if (!isAuthSessionMissingError(error)) console.error(`[${tag}] getClaims failed`, error);
    return false;
  }
  return Boolean(data?.claims?.sub);
}
