import { z } from "zod";
import {
  ADMIN_LEVELS,
  ADMIN_ROLES,
  ADMIN_USER_SORT_KEYS,
  type AdminUserFilters,
} from "@/lib/admin/admin-user-types";
import { ADMIN_DEFAULT_FILTERS, normalizeAdminSearch } from "@/lib/admin/admin-users-href";

export const ADMIN_MAX_PAGE = 100_000;
/** Department codes are short catalog values (public.departments.code); anything longer is not one. */
export const ADMIN_UNIT_MAX_LENGTH = 64;

const count = z.number().int().nonnegative();
// PostgREST serialises timestamptz as ISO-8601 with an offset; the exact text is formatted later, not re-parsed here.
const timestamp = z.string().min(1).nullable();
// Postgres `uuid` accepts any 8-4-4-4-12 hex (seed ids are not RFC 4122 v4), so match that, not z.uuid().
const pgUuid = z.guid();

/** One `admin_list_users` row, exactly the RPC columns (snake_case). The window totals repeat on every row. */
export const adminUserRowSchema = z.object({
  user_id: pgUuid,
  row_no: z.number().int().positive(),
  full_name: z.string().nullable(),
  email: z.string().nullable(),
  department: z.string().nullable(),
  sent: count,
  received: count,
  hearts: count,
  level: z.literal(ADMIN_LEVELS),
  badges: count,
  time_to_6_badges: timestamp,
  last_sign_in_at: timestamp,
  role: z.enum(ADMIN_ROLES),
  total_count: count,
  sum_sent: count,
  sum_received: count,
});
export const adminUserRowsSchema = z.array(adminUserRowSchema);
export type AdminUserRpcRow = z.infer<typeof adminUserRowSchema>;

const D = ADMIN_DEFAULT_FILTERS;

/**
 * URL state of /admin/users (first value of each parameter, as strings). Every field falls back to its default on its
 * own, so a bad value never fails the page (it still answers 200) and never drops the other filters.
 */
export const adminUserFiltersSchema = z.object({
  unit: z.string().min(1).max(ADMIN_UNIT_MAX_LENGTH).nullable().catch(D.unit),
  level: z
    .string()
    .regex(/^[0-4]$/)
    .transform(Number)
    .pipe(z.literal(ADMIN_LEVELS))
    .nullable()
    .catch(D.level),
  role: z.enum(ADMIN_ROLES).nullable().catch(D.role),
  q: z.string().transform(normalizeAdminSearch).catch(D.q),
  sort: z.enum(ADMIN_USER_SORT_KEYS).nullable().catch(D.sort),
  dir: z.enum(["asc", "desc"]).catch(D.dir),
  // Digits only (no sign, decimals or exponent); clamped first, so a 400-digit page is the last page, not page 1.
  page: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Math.min(Number(value), ADMIN_MAX_PAGE))
    .pipe(z.number().int().min(1))
    .catch(D.page),
}) satisfies z.ZodType<AdminUserFilters>;

/** Server Action input (setUserRole). Strict: a client-sent extra field is a rejection, not ignored. */
export const setUserRoleInputSchema = z.strictObject({
  userId: pgUuid,
  role: z.enum(ADMIN_ROLES),
});

/** What admin_set_user_role answers (text). */
export const setUserRoleAnswerSchema = z.enum(["ok", "forbidden", "self", "not_found", "invalid"]);
