import type { AdminUserFilters } from "@/lib/admin/admin-user-types";
import { ADMIN_DEFAULT_FILTERS } from "@/lib/admin/admin-users-href";
import { adminUserFiltersSchema } from "@/lib/validation/admin-users";

/** Next.js `searchParams` value shape (also built by the export route from the request URL). */
export type RawAdminSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * `?unit=&level=&role=&q=&sort=&dir=&page=` -> filters. Never throws: each invalid value falls back to its default
 * (unknown unit codes are kept: the database simply matches no row).
 */
export function parseAdminUserFilters(raw: RawAdminSearchParams): AdminUserFilters {
  const parsed = adminUserFiltersSchema.safeParse({
    unit: first(raw.unit),
    level: first(raw.level),
    role: first(raw.role),
    q: first(raw.q),
    sort: first(raw.sort),
    dir: first(raw.dir),
    page: first(raw.page),
  });
  return parsed.success ? parsed.data : { ...ADMIN_DEFAULT_FILTERS };
}
