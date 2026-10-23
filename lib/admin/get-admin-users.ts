import {
  ADMIN_PAGE_SIZE,
  type AdminUserFilters,
  type AdminUserRow,
  type AdminUsersPage,
} from "@/lib/admin/admin-user-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminUserRowsSchema, type AdminUserRpcRow } from "@/lib/validation/admin-users";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Rows of one window plus the totals of the whole filtered result. */
export type AdminUsersResult = { rows: AdminUserRow[]; total: number; sumSent: number; sumReceived: number };

const ERROR = { status: "error" } as const;

function toAdminUserRow(row: AdminUserRpcRow): AdminUserRow {
  return {
    userId: row.user_id,
    rowNo: row.row_no,
    fullName: row.full_name,
    email: row.email,
    department: row.department,
    sent: row.sent,
    received: row.received,
    hearts: row.hearts,
    level: row.level,
    badges: row.badges,
    timeToSixBadges: row.time_to_6_badges,
    lastSignInAt: row.last_sign_in_at,
    role: row.role,
  };
}

/**
 * One window of `admin_list_users` (the RPC checks is_admin itself and answers 0 rows to anyone else). `filters.page`
 * is ignored: the caller picks the window (the page, or the whole export). No rows -> totals 0, which also covers a
 * window past the end. Never throws: any failure is logged (codes and field paths only, no names or emails) -> null.
 */
export async function fetchAdminUsers(
  filters: AdminUserFilters,
  range: { limit: number; offset: number },
  client?: ServerClient,
): Promise<AdminUsersResult | null> {
  try {
    const supabase = client ?? (await createSupabaseServerClient());
    const { data, error } = await supabase.rpc("admin_list_users", {
      p_department: filters.unit,
      p_level: filters.level,
      p_role: filters.role,
      p_search: filters.q,
      p_sort: filters.sort,
      p_dir: filters.dir,
      p_limit: range.limit,
      p_offset: range.offset,
    });
    if (error) {
      console.error("[admin] admin_list_users failed", error);
      return null;
    }
    const parsed = adminUserRowsSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[admin] admin_list_users returned malformed rows", parsed.error.issues.map((i) => i.path.join(".")));
      return null;
    }
    const first = parsed.data[0];
    return {
      rows: parsed.data.map(toAdminUserRow),
      total: first?.total_count ?? 0,
      sumSent: first?.sum_sent ?? 0,
      sumReceived: first?.sum_received ?? 0,
    };
  } catch (err) {
    console.error("[admin] admin_list_users unexpected failure", err);
    return null;
  }
}

/** The /admin/users table: page `filters.page` (20 rows) plus the verified viewer id. Never throws. */
export async function getAdminUsers(filters: AdminUserFilters, client?: ServerClient): Promise<AdminUsersPage> {
  try {
    const supabase = client ?? (await createSupabaseServerClient());
    const range = { limit: ADMIN_PAGE_SIZE, offset: (filters.page - 1) * ADMIN_PAGE_SIZE };
    const [claims, result] = await Promise.all([supabase.auth.getClaims(), fetchAdminUsers(filters, range, supabase)]);
    const viewerId = claims.data?.claims.sub;
    if (claims.error || !viewerId) {
      console.error("[admin] admin users read without a verified session", claims.error);
      return ERROR;
    }
    if (!result) return ERROR;
    return { status: "ok", ...result, viewerId };
  } catch (err) {
    console.error("[admin] admin users unexpected failure", err);
    return ERROR;
  }
}
