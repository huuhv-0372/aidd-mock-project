import type { ReactNode } from "react";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";

/*
 * Gate of every /admin screen: only the `admin` role gets past requireAdmin() (forbidden(): HTTP 403, no user data in the HTML).
 * connection() first (the helper reads cookies inside a try/catch, see HeaderSessionControls), and nothing above the gate sits in a
 * <Suspense>, so the status is decided before any byte streams. Soft navigations do not re-run a layout: each page checks again.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale, dict } = await getRouteDictionary(params);
  await connection();
  await requireAdmin();
  return (
    <AdminShell locale={locale} dict={dict}>
      {children}
    </AdminShell>
  );
}
