import { LOGIN_PATH, POST_LOGIN_PATH, PUBLIC_PATHS } from "@/lib/auth/constants";
import { POST_LOGIN_NEXT_PARAM, parsePostLoginNext } from "@/lib/auth/post-login-next";

/**
 * Pure auth decision (exact path match after trailing-slash normalisation; slashes only -> "/"):
 * - authenticated on /login -> `next` when it passes the post-login allow-list, else the post-login page;
 * - anonymous outside PUBLIC_PATHS -> /login, carrying the path as `next` only when it is allow-listed;
 * - else null.
 */
export function resolveAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
  next: string | null = null,
): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (isAuthenticated) {
    return path === LOGIN_PATH ? (parsePostLoginNext(next) ?? POST_LOGIN_PATH) : null;
  }
  if (PUBLIC_PATHS.includes(path)) return null;
  const returnTo = parsePostLoginNext(path);
  return returnTo
    ? `${LOGIN_PATH}?${POST_LOGIN_NEXT_PARAM}=${encodeURIComponent(returnTo)}`
    : LOGIN_PATH;
}
