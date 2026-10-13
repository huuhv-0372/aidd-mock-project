import { LOGIN_PATH, POST_LOGIN_PATH, PUBLIC_PATHS } from "@/lib/auth/constants";

/**
 * Pure auth decision (exact path match after trailing-slash normalisation; slashes only -> "/"):
 * authenticated on /login -> post-login page; anonymous outside PUBLIC_PATHS -> /login; else null.
 */
export function resolveAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
): typeof POST_LOGIN_PATH | typeof LOGIN_PATH | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (isAuthenticated) return path === LOGIN_PATH ? POST_LOGIN_PATH : null;
  return PUBLIC_PATHS.includes(path) ? null : LOGIN_PATH;
}
