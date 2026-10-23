import { ADMIN_EXPORT_MAX_ROWS, type AdminUserFilters, type AdminUserRow } from "@/lib/admin/admin-user-types";
import { fetchAdminUsers, type AdminUsersResult } from "@/lib/admin/get-admin-users";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * PostgREST caps every function result at `db-max-rows` (Supabase default 1000), whatever p_limit asks for, so the
 * export reads chunks of at most this many rows. row_no and the order are stable across chunks.
 */
const EXPORT_CHUNK_ROWS = 1000;

export type AdminUsersExport = { status: "ok"; rows: AdminUserRow[] } | { status: "too_many" } | { status: "error" };

const ERROR = { status: "error" } as const;

/**
 * Every row of the filtered + sorted result, read chunk by chunk until `total` (from the first chunk). Above
 * ADMIN_EXPORT_MAX_ROWS -> `too_many` before any further read. All or nothing: a failed chunk, or one that is not
 * exactly the expected size or reports another total (server cap below the chunk size, or the data changed while
 * reading) -> `error`, never a partial list. Chunks are separate snapshots: a write that reorders rows across a chunk
 * boundary while keeping the total shows up as a user read twice (and so one never read) -> `error` too. Logs counts
 * and offsets only, never ids. Never throws (fetchAdminUsers never does).
 */
export async function fetchAdminUsersForExport(
  filters: AdminUserFilters,
  client: ServerClient,
): Promise<AdminUsersExport> {
  const first = await fetchAdminUsers(filters, { limit: EXPORT_CHUNK_ROWS, offset: 0 }, client);
  if (!first) return ERROR;
  const { total } = first;
  if (total > ADMIN_EXPORT_MAX_ROWS) return { status: "too_many" };

  const rows: AdminUserRow[] = [];
  const seen = new Set<string>();
  let chunk: AdminUsersResult | null = first;
  while (chunk) {
    const expected = Math.min(EXPORT_CHUNK_ROWS, total - rows.length);
    if (chunk.total !== total || chunk.rows.length !== expected) {
      console.error("[admin] export chunk mismatch", {
        offset: rows.length,
        expected,
        received: chunk.rows.length,
        total,
        chunkTotal: chunk.total,
      });
      return ERROR;
    }
    for (const row of chunk.rows) {
      if (seen.has(row.userId)) {
        console.error("[admin] export rows moved between chunks", { offset: rows.length, total });
        return ERROR;
      }
      seen.add(row.userId);
    }
    rows.push(...chunk.rows);
    if (rows.length === total) return { status: "ok", rows };
    chunk = await fetchAdminUsers(filters, { limit: EXPORT_CHUNK_ROWS, offset: rows.length }, client);
  }
  return ERROR; // a chunk read failed; fetchAdminUsers has logged it
}
