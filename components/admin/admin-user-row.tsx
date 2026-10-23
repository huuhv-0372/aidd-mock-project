import { formatAdminDateTime } from "@/lib/admin/format-admin-datetime";
import type { AdminUserRow } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";
import { AdminUserActionsMenu } from "./admin-user-actions-menu";

const CELL = "px-3 py-3 align-middle";
/* Date cells have two 28px lines (Figma): 8px padding gives the 72px the png shows for a two-line row. */
const DATE_CELL = "px-3 py-2 text-center align-middle leading-7";

function DateTimeCell({ col, iso, empty }: { col: "time6" | "last-login"; iso: string | null; empty: string }) {
  const value = formatAdminDateTime(iso);
  return (
    <td data-testid={`admin-cell-${col}`} className={DATE_CELL}>
      {value ? (
        <>
          <span data-testid={`admin-cell-${col}-date`} className="block">
            {value.date}
          </span>
          <span data-testid={`admin-cell-${col}-time`} className="block">
            {value.time}
          </span>
        </>
      ) : (
        empty
      )}
    </td>
  );
}

/*
 * One user row (Figma ROW - User, 85px with a 3-line name, 73px with two): odd rows #00070C, even rows #00101A, 1px #2E3940
 * under each. Numbers, dates, role and the "..." are centred; name and email are left and wrap inside their column (email breaks
 * anywhere, as the design does). Null name / email / dates read "-". Total Heart is the red of the Kudos heart.
 */
export function AdminUserTableRow({
  row,
  viewerId,
  copy,
}: {
  row: AdminUserRow;
  viewerId: string;
  copy: Dictionary["admin"];
}) {
  const empty = copy.table.empty;
  return (
    <tr data-testid="admin-row" data-user-id={row.userId} className="border-b border-login-divider odd:bg-kudos-panel even:bg-login-bg">
      <td data-testid="admin-cell-id" className={`${CELL} text-center`}>
        {row.rowNo}
      </td>
      <td data-testid="admin-cell-user" className={CELL}>
        {row.fullName ?? empty}
      </td>
      <td data-testid="admin-cell-email" className={`${CELL} break-all`}>
        {row.email ?? empty}
      </td>
      <td data-testid="admin-cell-sent" className={`${CELL} text-center`}>
        {row.sent}
      </td>
      <td data-testid="admin-cell-received" className={`${CELL} text-center`}>
        {row.received}
      </td>
      <td data-testid="admin-cell-hearts" className={`${CELL} text-center text-kudos-heart`}>
        {row.hearts}
      </td>
      <td data-testid="admin-cell-level" className={`${CELL} text-center`}>
        {row.level}
      </td>
      <td data-testid="admin-cell-badges" className={`${CELL} text-center`}>
        {row.badges}
      </td>
      <DateTimeCell col="time6" iso={row.timeToSixBadges} empty={empty} />
      <DateTimeCell col="last-login" iso={row.lastSignInAt} empty={empty} />
      <td data-testid="admin-cell-role" className={`${CELL} text-center`}>
        {copy.table.roles[row.role]}
      </td>
      <td data-testid="admin-cell-actions" className="px-2 py-1 align-middle">
        <AdminUserActionsMenu
          userId={row.userId}
          name={row.fullName ?? row.email ?? empty}
          email={row.email ?? empty}
          role={row.role}
          isSelf={row.userId === viewerId}
          copy={{ rowActions: copy.rowActions, roleDialog: copy.roleDialog }}
        />
      </td>
    </tr>
  );
}
