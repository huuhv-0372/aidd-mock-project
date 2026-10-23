import type { AdminUserFilters, AdminUsersPage } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminExportLink } from "./admin-export-link";
import { AdminPagination } from "./admin-pagination";
import { AdminToastProvider } from "./admin-toast";
import { AdminUsersFilters } from "./admin-users-filters";
import { AdminUsersTable } from "./admin-users-table";

/*
 * Body of /admin/users (Figma 773:26406, 1280 column): title row ("User" 45/52 + Export, 52px), filters (74px), table; 16px between
 * each. Under the table the pagination (not in Figma). A failed read keeps the frame and shows one generic alert instead of the
 * table; no rows shows the empty state. The AdminToastProvider wraps all of it: the "role updated" status must outlive a role change
 *
 * that empties a filtered list (the table, and its row menus, unmount while the empty state shows). `unitCodes` is null when the departments could not be read: the Unit list then offers "All" only.
 */
export function AdminUsersView({
  filters,
  result,
  unitCodes,
  dict,
}: {
  filters: AdminUserFilters;
  result: AdminUsersPage;
  unitCodes: string[] | null;
  dict: Dictionary;
}) {
  const { admin } = dict;
  return (
    <AdminToastProvider>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          {/* mm:773:26407 */}
          <h1 data-testid="admin-title" className="text-4xl leading-tight font-normal text-login-bg md:text-[45px] md:leading-[52px]">
            {admin.title}
          </h1>
          <AdminExportLink filters={filters} label={admin.exportLabel} />
        </div>
        <AdminUsersFilters filters={filters} unitCodes={unitCodes ?? []} copy={admin.filters} roleNames={admin.table.roles} />
        {result.status === "error" ? (
          <p role="alert" data-testid="admin-error" className="rounded border border-login-divider bg-login-bg p-6 text-base leading-6 font-bold text-white">
            {admin.listError}
          </p>
        ) : result.rows.length === 0 ? (
          <AdminEmptyState filters={filters} copy={admin.emptyState} />
        ) : (
          <>
            <AdminUsersTable
              rows={result.rows}
              sums={{ sent: result.sumSent, received: result.sumReceived }}
              filters={filters}
              viewerId={result.viewerId}
              copy={admin}
            />
            <AdminPagination filters={filters} total={result.total} copy={admin.pagination} />
          </>
        )}
      </div>
    </AdminToastProvider>
  );
}
