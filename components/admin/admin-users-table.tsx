import type { AdminUserFilters, AdminUserRow, AdminUserSortKey } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";
import { AdminUserTableRow } from "./admin-user-row";
import { SortableHeaderCell } from "./sortable-header-cell";

type Column = {
  /** Testid suffix (`admin-th-<col>`) and the contract's ColumnKey. */
  col: string;
  title: keyof Dictionary["admin"]["table"]["columns"];
  /** Header cell width in px (Figma, sums to 1280 with Email taking the remainder). */
  width?: number;
  align?: "left" | "center";
  sort?: AdminUserSortKey;
  sum?: "sent" | "received";
};

/* Figma `Table - User` header cells, left to right: 60/120/141(flex)/126/126/84/81/116/126/116/104/80. */
const COLUMNS: Column[] = [
  { col: "id", title: "id", width: 60, align: "center" },
  { col: "user", title: "user", width: 120 },
  { col: "email", title: "email" },
  { col: "sent", title: "sent", width: 126, sort: "sent", sum: "sent" },
  { col: "received", title: "received", width: 126, sort: "received", sum: "received" },
  { col: "hearts", title: "hearts", width: 84, sort: "hearts" },
  { col: "level", title: "level", width: 81, sort: "level" },
  { col: "badges", title: "badges", width: 116, sort: "badges" },
  { col: "time6", title: "time6", width: 126, sort: "time6" },
  { col: "last-login", title: "lastLogin", width: 116, sort: "last_login" },
  { col: "role", title: "role", width: 104, align: "center" },
  { col: "actions", title: "actions", width: 80, align: "center" },
];

/*
 * User table (Figma 773:27567, 1280 wide). Fixed layout with the Figma column widths; `min-w-[1280px]` inside an `overflow-x-auto` box,
 * so on a phone the table scrolls in its own box and the page does not. A Server Component: sort is a link per column, the only
 * client leaves are the row menus (their "role updated" status comes from the AdminToastProvider in AdminUsersView).
 */
export function AdminUsersTable({
  rows,
  sums,
  filters,
  viewerId,
  copy,
}: {
  rows: AdminUserRow[];
  sums: { sent: number; received: number };
  filters: AdminUserFilters;
  viewerId: string;
  copy: Dictionary["admin"];
}) {
  return (
    <div data-testid="admin-table-scroll" className="w-full overflow-x-auto">
      <table data-testid="admin-table" className="w-full min-w-[1280px] table-fixed border-collapse text-sm leading-5 font-medium tracking-[0.1px] text-white">
        <colgroup>
          {COLUMNS.map(({ col, width }) => (
            <col key={col} style={width ? { width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map(({ col, title, align, sort, sum }) => (
              <SortableHeaderCell
                key={col}
                col={col}
                label={copy.table.columns[title]}
                align={align}
                sortKey={sort}
                filters={filters}
                sum={sum ? sums[sum] : undefined}
                sortByLabel={copy.table.sortBy}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <AdminUserTableRow key={row.userId} row={row} viewerId={viewerId} copy={copy} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
