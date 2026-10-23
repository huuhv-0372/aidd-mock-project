import Link from "next/link";
import { adminUsersHref } from "@/lib/admin/admin-users-href";
import { ADMIN_PAGE_SIZE, type AdminUserFilters } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";
import { FOCUS_ON_GREY } from "./admin-class-names";

const BOX =
  "flex min-h-11 min-w-11 items-center justify-center rounded border border-login-divider px-3 text-sm leading-5 font-bold motion-safe:transition-colors motion-safe:duration-200";
const LINK = `${BOX} bg-white text-login-bg hover:bg-[#ffea9e] aria-[current=page]:bg-login-bg aria-[current=page]:text-white ${FOCUS_ON_GREY}`;
const UNAVAILABLE = `${BOX} cursor-not-allowed bg-white/40 text-login-bg/50`;

/** Page numbers to show: all of them up to 7, else first, last and the current page with its neighbours (`null` = a gap). */
function pageWindow(current: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const keep = new Set([1, last, current - 1, current, current + 1]);
  const pages = [...keep].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  return pages.flatMap((n, i) => (i > 0 && n - pages[i - 1] > 1 ? [null, n] : [n]));
}

/*
 * Pagination under the table (not in Figma: the owner accepted the deviation, clarifications #4). Server-side pages of 20, every
 * control is a link that keeps the filters and the sort (`adminUsersHref`). Previous / Next are `<span aria-disabled>` without
 * href when there is nowhere to go; the current page is a link with `aria-current="page"`. The total counts the whole filtered result.
 */
export function AdminPagination({
  filters,
  total,
  copy,
}: {
  filters: AdminUserFilters;
  total: number;
  copy: Dictionary["admin"]["pagination"];
}) {
  const last = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, last);
  const hrefOf = (n: number) => adminUsersHref({ ...filters, page: n });

  return (
    <nav aria-label={copy.ariaLabel} data-testid="admin-pagination" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <p data-testid="admin-total" className="text-base leading-6 font-medium text-login-bg">
        {copy.total.replace("{count}", String(total))}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link href={hrefOf(page - 1)} prefetch={false} data-testid="admin-page-prev" className={LINK}>
            {copy.prev}
          </Link>
        ) : (
          <span data-testid="admin-page-prev" aria-disabled="true" className={UNAVAILABLE}>
            {copy.prev}
          </span>
        )}
        {pageWindow(page, last).map((n, index) =>
          n === null ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-login-bg">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={hrefOf(n)}
              prefetch={false}
              data-testid={`admin-page-${n}`}
              aria-current={n === page ? "page" : undefined}
              aria-label={copy.page.replace("{page}", String(n))}
              className={LINK}
            >
              {n}
            </Link>
          ),
        )}
        {page < last ? (
          <Link href={hrefOf(page + 1)} prefetch={false} data-testid="admin-page-next" className={LINK}>
            {copy.next}
          </Link>
        ) : (
          <span data-testid="admin-page-next" aria-disabled="true" className={UNAVAILABLE}>
            {copy.next}
          </span>
        )}
      </div>
    </nav>
  );
}
