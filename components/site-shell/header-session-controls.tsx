import { connection } from "next/server";
import { getIsAdmin } from "@/lib/admin/get-is-admin";
import { getIsAuthenticated } from "@/lib/auth/get-is-authenticated";
import { LoginLink } from "./login-link";
import type { ShellCopy } from "./shell-links";
import { SignedInControls } from "./signed-in-controls";
import { SignOutForm } from "./sign-out-form";

/*
 * Reads the verified session per request; render inside <Suspense> so `/` keeps its static shell.
 * connection() stops the prerender here, before getIsAuthenticated's try/catch could swallow the
 * cookies() prerender bailout and log it as an auth failure. The Dashboard item is for admins only:
 * getIsAdmin() asks the database (never the token) and answers false on any failure. It runs only
 * after the session check on purpose: is_admin is not granted to `anon`, so asking it for a guest of
 * the public `/` would fail with 42501 and log an error on every guest view.
 */
export async function HeaderSessionControls({ copy }: { copy: ShellCopy }) {
  await connection();
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) return <LoginLink label={copy.loginLink} />;
  const isAdmin = await getIsAdmin();
  return (
    <SignedInControls copy={copy} signOutSlot={<SignOutForm label={copy.account.signOut} />} isAdmin={isAdmin} />
  );
}
