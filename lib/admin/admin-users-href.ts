import {
  ADMIN_SEARCH_MAX_LENGTH,
  type AdminSortDir,
  type AdminUserFilters,
} from "@/lib/admin/admin-user-types";
import { ADMIN_USERS_EXPORT_PATH, ADMIN_USERS_PATH } from "@/lib/navigation/routes";

/*
 * Client-safe on purpose: the filter dropdowns and the search box import it, so it must not pull zod or any server
 * module. The parser (parse-admin-user-filters.ts) falls back to these same defaults, so an href and a parse agree.
 */

/** A sort click on an unsorted column starts descending; with no sort key the direction is ignored. */
const DEFAULT_DIR: AdminSortDir = "desc";

/** The URL state of a bare /admin/users. Every value equal to its default is left out of the URL. */
export const ADMIN_DEFAULT_FILTERS: AdminUserFilters = {
  unit: null,
  level: null,
  role: null,
  q: "",
  sort: null,
  dir: DEFAULT_DIR,
  page: 1,
};

/** Search text as the parser keeps it: trimmed, cut to the limit, trimmed again (no space left by the cut). */
export function normalizeAdminSearch(q: string): string {
  return q.trim().slice(0, ADMIN_SEARCH_MAX_LENGTH).trim();
}

/** Fixed order unit, level, role, q, sort, dir, page; `dir` only with a sort key; `page` only when asked and > 1. */
function filterQuery(filters: Partial<AdminUserFilters>, withPage: boolean): string {
  const query = new URLSearchParams();
  if (filters.unit) query.set("unit", filters.unit);
  if (filters.level !== null && filters.level !== undefined) query.set("level", String(filters.level));
  if (filters.role) query.set("role", filters.role);
  const q = normalizeAdminSearch(filters.q ?? "");
  if (q) query.set("q", q);
  if (filters.sort) {
    query.set("sort", filters.sort);
    query.set("dir", filters.dir ?? DEFAULT_DIR);
  }
  if (withPage && filters.page !== undefined && Number.isInteger(filters.page) && filters.page > 1) {
    query.set("page", String(filters.page));
  }
  return query.toString();
}

/** `/admin/users` for this state; keys left out (or undefined) take their default. Pass page: 1 on any filter change. */
export function adminUsersHref(partial: Partial<AdminUserFilters>): string {
  const qs = filterQuery(partial, true);
  return qs ? `${ADMIN_USERS_PATH}?${qs}` : ADMIN_USERS_PATH;
}

/**
 * CSV download of the whole filtered + sorted result (the page number does not apply). Always ends in `?` plus the
 * filters, even when there are none: render it in a plain <a download>, not next/link.
 */
export function adminExportHref(filters: AdminUserFilters): string {
  return `${ADMIN_USERS_EXPORT_PATH}?${filterQuery(filters, false)}`;
}
