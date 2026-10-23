/*
 * Contract between the admin data layer (lib/admin, the admin_* RPCs, the CSV route) and the admin UI
 * (app/[locale]/admin, components/admin). Plan: plans/261023-1207-admin-user-management/plan.md.
 */

export const ADMIN_ROLES = ["user", "admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Hero tier by distinct non-anonymous senders (lib/kudos/hero-title.ts): 0 none, 1 New, 2 Rising, 3 Super, 4 Legend. */
export const ADMIN_LEVELS = [0, 1, 2, 3, 4] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

/** Sortable columns, in table order. Clicking an unsorted column sorts `desc` first. */
export const ADMIN_USER_SORT_KEYS = ["sent", "received", "hearts", "level", "badges", "time6", "last_login"] as const;
export type AdminUserSortKey = (typeof ADMIN_USER_SORT_KEYS)[number];
export type AdminSortDir = "asc" | "desc";

export const ADMIN_PAGE_SIZE = 20;
/** The CSV route answers 413 above this many filtered rows instead of truncating. */
export const ADMIN_EXPORT_MAX_ROWS = 5000;
export const ADMIN_SEARCH_MAX_LENGTH = 100;

/**
 * URL state of /admin/users (`unit`, `level`, `role`, `q`, `sort`, `dir`, `page`). `null` = no filter.
 * `sort: null` = default order (profile created_at ascending); `dir` is then ignored.
 */
export type AdminUserFilters = {
  unit: string | null;
  level: AdminLevel | null;
  role: AdminRole | null;
  q: string;
  sort: AdminUserSortKey | null;
  dir: AdminSortDir;
  page: number;
};

/** One table row (one admin_list_users row minus the window totals). Timestamps are ISO strings or null. */
export type AdminUserRow = {
  userId: string;
  /** Position in the whole filtered + sorted result (1-based, continuous across pages): the "ID" column. */
  rowNo: number;
  fullName: string | null;
  email: string | null;
  department: string | null;
  sent: number;
  received: number;
  hearts: number;
  level: AdminLevel;
  badges: number;
  timeToSixBadges: string | null;
  lastSignInAt: string | null;
  role: AdminRole;
};

/** What /admin/users renders. `total` / `sumSent` / `sumReceived` cover the whole filtered result, not the page. */
export type AdminUsersPage =
  | {
      status: "ok";
      rows: AdminUserRow[];
      total: number;
      sumSent: number;
      sumReceived: number;
      /** The signed-in admin: their own row gets no role action. */
      viewerId: string;
    }
  | { status: "error" };

export type SetUserRoleInput = { userId: string; role: AdminRole };

/** `self` = an admin tried to change their own role; `validation` = bad input, the RPC was never called. */
export type SetUserRoleResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "self" | "not_found" | "validation" | "server" };
