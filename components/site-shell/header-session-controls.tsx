import { connection } from "next/server";
import { getIsAuthenticated } from "@/lib/auth/get-is-authenticated";
import { LoginLink } from "./login-link";
import { SignedInControls } from "./signed-in-controls";
import { SignOutForm } from "./sign-out-form";

/*
 * Reads the verified session per request; render inside <Suspense> so `/` keeps its static shell.
 * connection() stops the prerender here, before getIsAuthenticated's try/catch could swallow the
 * cookies() prerender bailout and log it as an auth failure.
 */
export async function HeaderSessionControls() {
  await connection();
  const isAuthenticated = await getIsAuthenticated();
  return isAuthenticated ? <SignedInControls signOutSlot={<SignOutForm />} /> : <LoginLink />;
}
