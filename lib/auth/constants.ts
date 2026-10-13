export const LOGIN_PATH = "/login";
export const CALLBACK_PATH = "/auth/callback";
/** Single post-login target; no `next` param means no open-redirect surface. */
export const POST_LOGIN_PATH = "/";
export const LOGIN_ERROR_PARAM = "error";
export const LOGIN_ERROR_VALUE = "auth_failed";
/** The only auth failure text a client ever sees; details stay in server logs. */
export const LOGIN_ERROR_MESSAGE = "Đăng nhập không thành công. Vui lòng thử lại.";
/** Only Google accounts on this domain may sign in (also enforced by the DB, see profiles migration). */
export const ALLOWED_EMAIL_DOMAIN = "sun-asterisk.com";
/**
 * Exact paths an anonymous visitor may open; every other path redirects to /login (default-deny).
 * Add new public routes here. /countdown stays public: the pre-launch gate sends everyone there.
 */
export const PUBLIC_PATHS: readonly string[] = [LOGIN_PATH, CALLBACK_PATH, "/countdown"];
