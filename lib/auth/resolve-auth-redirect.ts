import { LOGIN_PATH, POST_LOGIN_PATH } from "@/lib/auth/constants";

/** Pure auth decision: an authenticated user on /login goes to the post-login page; else null. */
export function resolveAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
): typeof POST_LOGIN_PATH | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return isAuthenticated && path === LOGIN_PATH ? POST_LOGIN_PATH : null;
}
