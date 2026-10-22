import { cookies } from "next/headers";
import { POST_LOGIN_NEXT_COOKIE, postLoginNextCookieOptions } from "@/lib/auth/post-login-next";

/**
 * Deletes the one-shot post-login cookie through the `cookies()` store. Not `response.cookies`: once the store has
 * been written (Supabase does in the callback), Next re-parses the response's own Set-Cookie headers and that parser
 * drops the falsy `Max-Age=0`, so the browser would keep an empty cookie. Its own module: importing `next/headers`
 * straight into the callback route made the bundler emit a duplicate ~300 KB server chunk.
 */
export async function clearPostLoginNextCookie(): Promise<void> {
  (await cookies()).set(POST_LOGIN_NEXT_COOKIE, "", postLoginNextCookieOptions(0));
}
