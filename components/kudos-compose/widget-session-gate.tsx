import { connection } from "next/server";
import type { WidgetCopy } from "@/components/site-shell/widget-button";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getIsAuthenticated } from "@/lib/auth/get-is-authenticated";
import { ComposerWidget } from "./composer-widget";

/*
 * Homepage widget: the page is public, so only this leaf reads the verified session (render it inside <Suspense> to keep
 * the static shell). A guest still gets the menu and can read the rules, but "Viết KUDOS" links to the login page.
 * connection() stops the prerender before getIsAuthenticated's try/catch could log the cookies() bailout as an auth failure.
 */
export async function WidgetSessionGate({ label, copy }: { label: string; copy: WidgetCopy }) {
  await connection();
  const isAuthenticated = await getIsAuthenticated();
  return <ComposerWidget label={label} copy={copy} writeKudoHref={isAuthenticated ? undefined : LOGIN_PATH} />;
}
