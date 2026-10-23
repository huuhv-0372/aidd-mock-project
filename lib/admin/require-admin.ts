import { forbidden } from "next/navigation";
import { cache } from "react";
import { getIsAdmin } from "@/lib/admin/get-is-admin";

// One database check per request, shared by the admin layout and the page under it.
const isAdminForRequest = cache(() => getIsAdmin());

/**
 * Gate of the admin pages: returns for an admin, otherwise renders the 403 page (forbidden(), a real HTTP 403 when
 * called before anything streams). Route handlers are not wrapped by layouts: they call getIsAdmin() themselves.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminForRequest())) forbidden();
}
