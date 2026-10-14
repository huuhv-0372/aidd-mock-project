import { HOME_PATH } from "@/lib/navigation/routes";
import { login as viLogin } from "@/messages/vi/login";

export const LOGIN_PATH = "/login";
export const CALLBACK_PATH = "/auth/callback";
/** Single post-login target; no `next` param means no open-redirect surface. */
export const POST_LOGIN_PATH = "/";
export const LOGIN_ERROR_PARAM = "error";
export const LOGIN_ERROR_VALUE = "auth_failed";
/** Default-locale (vi) failure text; localised copy lives in the dictionary. Details stay in server logs. */
export const LOGIN_ERROR_MESSAGE = viLogin.errorMessage;
/** Only Google accounts on this domain may sign in (also enforced by the DB, see profiles migration). */
export const ALLOWED_EMAIL_DOMAIN = "sun-asterisk.com";
/**
 * Exact paths an anonymous visitor may open; every other path redirects to /login (default-deny).
 * Add new public routes here. /countdown stays public: the pre-launch gate sends everyone there.
 * The homepage is public per spec (guests see public content; the header shows a login link).
 */
export const PUBLIC_PATHS: readonly string[] = [HOME_PATH, LOGIN_PATH, CALLBACK_PATH, "/countdown"];
