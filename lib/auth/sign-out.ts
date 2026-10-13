"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Ends the local session and always lands on /login; failures are logged, never returned. */
export async function signOut(): Promise<never> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) console.error("[sign-out] Supabase signOut failed", error);
  } catch (err) {
    console.error("[sign-out] unexpected failure", err);
  }
  // Outside the try/catch: redirect() throws a control-flow error that must not be swallowed.
  redirect(LOGIN_PATH);
}
