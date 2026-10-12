export type GateTarget = "/countdown" | "/login";

/** Pure gate decision: where to redirect, or null to let the request through. */
export function resolveGateRedirect(pathname: string, launched: boolean): GateTarget | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const onCountdown = path === "/countdown";
  if (launched) return onCountdown ? "/login" : null;
  return onCountdown ? null : "/countdown";
}
