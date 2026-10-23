import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ADMIN_USERS_PATH } from "@/lib/navigation/routes";

/* Dashboard has no Overview yet: /admin opens the Users screen. The gate runs here too so a non-admin gets the 403, never the redirect. */
export default async function AdminIndexPage() {
  await connection();
  await requireAdmin();
  redirect(ADMIN_USERS_PATH);
}
