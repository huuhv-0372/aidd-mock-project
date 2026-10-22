"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ALLOWED_EMAIL_DOMAIN,
  CALLBACK_PATH,
  LOGIN_ERROR_PARAM,
  LOGIN_ERROR_VALUE,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import {
  POST_LOGIN_NEXT_COOKIE,
  POST_LOGIN_NEXT_MAX_AGE,
  POST_LOGIN_NEXT_PARAM,
  parsePostLoginNext,
  postLoginNextCookieOptions,
} from "@/lib/auth/post-login-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseRequestOrigin } from "@/lib/validation/request-origin";

/** Resolves the Google authorize URL (PKCE verifier cookie is written as a side effect). */
async function getGoogleAuthorizeUrl(): Promise<string | null> {
  // Origin only — Next validates it against Host for actions; Host itself is spoofable.
  const origin = parseRequestOrigin((await headers()).get("origin"));
  if (!origin) {
    console.error("[sign-in-with-google] missing or invalid Origin header");
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Constant callback (no `next` here): the post-login target travels in a cookie instead.
      redirectTo: `${origin}${CALLBACK_PATH}`,
      // UX hint only (pre-filters Google's account chooser); enforcement is in callback + DB.
      queryParams: { hd: ALLOWED_EMAIL_DOMAIN },
    },
  });
  if (error || !data.url) {
    console.error("[sign-in-with-google] signInWithOAuth failed", error ?? "no url returned");
    return null;
  }
  return data.url;
}

/**
 * Keeps an allow-listed `next` for the callback, or clears a stale one. A failed write only costs
 * the return trip (the callback falls back to the post-login page), so it is logged, not fatal.
 */
async function rememberPostLoginNext(value: FormDataEntryValue | null): Promise<void> {
  const next = parsePostLoginNext(value);
  try {
    (await cookies()).set(
      POST_LOGIN_NEXT_COOKIE,
      next ?? "",
      postLoginNextCookieOptions(next ? POST_LOGIN_NEXT_MAX_AGE : 0),
    );
  } catch (err) {
    console.error("[sign-in-with-google] could not write the post-login cookie", err);
  }
}

/** Server action for `<form action={signInWithGoogle}>`; reads only the optional `next` field. */
export async function signInWithGoogle(formData: FormData): Promise<never> {
  let url: string | null = null;
  try {
    url = await getGoogleAuthorizeUrl();
    if (url) await rememberPostLoginNext(formData.get(POST_LOGIN_NEXT_PARAM));
  } catch (err) {
    console.error("[sign-in-with-google] unexpected failure", err);
  }
  // redirect() throws to unwind, so it must stay outside the try/catch above.
  redirect(url ?? `${LOGIN_PATH}?${LOGIN_ERROR_PARAM}=${LOGIN_ERROR_VALUE}`);
}
