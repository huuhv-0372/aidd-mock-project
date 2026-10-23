import { adminFileDate } from "@/lib/admin/format-admin-datetime";
import { fetchAdminUsersForExport } from "@/lib/admin/fetch-admin-users-for-export";
import { getIsAdmin } from "@/lib/admin/get-is-admin";
import { parseAdminUserFilters, type RawAdminSearchParams } from "@/lib/admin/parse-admin-user-filters";
import { buildUsersCsv } from "@/lib/admin/users-csv";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Never cached anywhere, never sniffed into something the browser renders.
const BASE_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function plain(status: number, text: string): Response {
  return new Response(text, { status, headers: { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
}

function rawParams(params: URLSearchParams): RawAdminSearchParams {
  const raw: RawAdminSearchParams = {};
  for (const key of new Set(params.keys())) raw[key] = params.getAll(key);
  return raw;
}

/**
 * GET /admin/users/export?<the page's filters>: CSV of the whole filtered + sorted result (ID = row number, same order
 * as the table). Layouts do not wrap route handlers, so admin is checked here (403); guests never get here (proxy sends
 * them to /login). Read-only GET: no Origin check needed. Rows are read in 1000-row chunks (PostgREST db-max-rows);
 * above ADMIN_EXPORT_MAX_ROWS rows -> 413 and any failed or short chunk -> 500, never a silently truncated file. The
 * 500 body is generic; details are logged only.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!(await getIsAdmin(supabase))) return plain(403, "Forbidden");

    const filters = parseAdminUserFilters(rawParams(new URL(request.url).searchParams));
    const result = await fetchAdminUsersForExport(filters, supabase);
    if (result.status === "too_many") return plain(413, "Too many rows to export");
    if (result.status === "error") return plain(500, "Export failed");

    return new Response(buildUsersCsv(result.rows), {
      status: 200,
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${adminFileDate(new Date())}.csv"`,
      },
    });
  } catch (err) {
    console.error("[admin] export unexpected failure", err);
    return plain(500, "Export failed");
  }
}
