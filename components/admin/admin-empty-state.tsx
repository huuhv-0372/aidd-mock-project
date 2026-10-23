import Link from "next/link";
import { adminUsersHref } from "@/lib/admin/admin-users-href";
import type { AdminUserFilters } from "@/lib/admin/admin-user-types";
import { ADMIN_USERS_PATH } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";
import { FOCUS_ON_GREY } from "./admin-class-names";

const ACTION = `flex min-h-11 items-center rounded border border-login-divider bg-white px-4 text-sm leading-5 font-bold text-login-bg hover:bg-[#ffea9e] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_ON_GREY}`;

/*
 * No rows (not in Figma): the filters match nobody, or the page is past the last one. "Back to page 1" keeps the filters and shows
 * only when the page is the problem; "Clear filters" shows when any filter or search is set.
 */
export function AdminEmptyState({ filters, copy }: { filters: AdminUserFilters; copy: Dictionary["admin"]["emptyState"] }) {
  const filtered = filters.unit !== null || filters.level !== null || filters.role !== null || filters.q !== "";
  return (
    <div data-testid="admin-empty" className="flex flex-col items-start gap-4 rounded border border-login-divider bg-login-bg p-6 text-white">
      <p className="text-base leading-6 font-bold">{copy.title}</p>
      <div className="flex flex-wrap gap-3">
        {filters.page > 1 ? (
          <Link
            href={adminUsersHref({ ...filters, page: 1 })}
            prefetch={false}
            data-testid="admin-empty-first-page"
            className="flex min-h-11 items-center rounded bg-login-accent px-4 text-sm leading-5 font-bold text-login-bg outline-offset-2 hover:bg-[#fff3c4] focus-visible:outline-2 focus-visible:outline-white motion-safe:transition-colors motion-safe:duration-200"
          >
            {copy.firstPage}
          </Link>
        ) : null}
        {filtered ? (
          <Link href={ADMIN_USERS_PATH} prefetch={false} data-testid="admin-empty-reset" className={ACTION}>
            {copy.reset}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
