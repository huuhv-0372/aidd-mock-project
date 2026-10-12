"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ALLOWED_EMAIL_DOMAIN,
  CALLBACK_PATH,
  LOGIN_ERROR_PARAM,
  LOGIN_ERROR_VALUE,
  LOGIN_PATH,
} from "@/lib/auth/constants";
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

/** Server action for `<form action={signInWithGoogle}>`; form data is ignored. */
export async function signInWithGoogle(): Promise<never> {
  let url: string | null = null;
  try {
    url = await getGoogleAuthorizeUrl();
  } catch (err) {
    console.error("[sign-in-with-google] unexpected failure", err);
  }
  // redirect() throws to unwind, so it must stay outside the try/catch above.
  redirect(url ?? `${LOGIN_PATH}?${LOGIN_ERROR_PARAM}=${LOGIN_ERROR_VALUE}`);
}
