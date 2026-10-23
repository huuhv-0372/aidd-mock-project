import Link from "next/link";
import { Fragment } from "react";
import { adminUsersHref } from "@/lib/admin/admin-users-href";
import type { AdminUserFilters, AdminUserSortKey } from "@/lib/admin/admin-user-types";
import { FOCUS_ON_DARK } from "./admin-class-names";
import { IconCaretDown, IconCaretUp } from "./admin-icons";

type Props = {
  /** Suffix of the testids: `admin-th-<col>`, `admin-sort-<col>`, `admin-sum-<col>`. */
  col: string;
  /** Column title; `\n` is the design's line break. */
  label: string;
  align?: "left" | "center";
  /** Present = a sortable column: the title becomes a link to the sorted, page-1 list. */
  sortKey?: AdminUserSortKey;
  filters: AdminUserFilters;
  /** Sum over the whole filtered result, shown as "(N)" after the title (sent / received only). */
  sum?: number;
  sortByLabel: string;
};

/* The design breaks two-line titles itself ("∑ sent" / "Kudos (100)"): each line is its own nowrap block, so a narrow cell can never
 * wrap a third line. A space text node sits between the lines so the text still reads "∑ sent Kudos" to search and screen readers.
 * A one-line title (Level, ID...) stays a bare text node: a span holding just "Level" would be an element with exactly that text. */
function Lines({ label, sum, col }: { label: string; sum?: number; col: string }) {
  const lines = label.split("\n");
  const total =
    sum === undefined ? null : (
      <>
        {" "}
        <span data-testid={`admin-sum-${col}`}>({sum})</span>
      </>
    );
  if (lines.length === 1) {
    return (
      <>
        {label}
        {total}
      </>
    );
  }
  return lines.map((line, index) => {
    const last = index === lines.length - 1;
    return (
      <Fragment key={line}>
        <span className="block whitespace-nowrap">
          {line}
          {last ? total : null}
        </span>
        {last ? null : " "}
      </Fragment>
    );
  });
}

/* Sorter of Figma `Table-Cell/Header`: caret-up and caret-down (11 x 11) stacked, centres -3.5 / +4.5 px from the middle. */
function Sorter({ direction }: { direction: "asc" | "desc" | null }) {
  const dim = "opacity-40";
  return (
    <span aria-hidden="true" className="relative block h-[22px] w-[11px] shrink-0 text-[#d9d9d9]">
      <IconCaretUp className={`absolute top-[2px] left-0 ${direction === "desc" ? dim : ""} ${direction === "asc" ? "text-white" : ""}`} />
      <IconCaretDown className={`absolute top-[10px] left-0 ${direction === "asc" ? dim : ""} ${direction === "desc" ? "text-white" : ""}`} />
    </span>
  );
}

/*
 * One header cell of the user table (Figma `Table-Cell/Header`): #00101A, 12px side padding, 1px #2E3940 bottom border, a 22px divider
 * at the left edge (not on the first cell), Montserrat Medium 14/20 white. A sortable column is a link: the first click sorts
 * descending, the next flips it (clarifications: sort keys), and any sort click goes back to page 1. `aria-sort` on the th follows the URL.
 * Row height: 12 + two 20px lines + 12 + the 1px border = 65, Figma's header row (its 13px bottom padding sits inside the border box).
 * A sortable title is announced as "{sortByLabel} {title}".
 */
export function SortableHeaderCell({ col, label, align = "left", sortKey, filters, sum, sortByLabel }: Props) {
  const sortedHere = sortKey !== undefined && filters.sort === sortKey;
  const direction = sortedHere ? filters.dir : null;
  const ariaSort = sortKey === undefined ? undefined : direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const th = `relative border-b border-login-divider bg-login-bg px-3 pt-3 pb-3 align-middle text-sm leading-5 font-medium tracking-[0.1px] text-white before:absolute before:top-1/2 before:left-0 before:h-[22px] before:w-px before:-translate-y-1/2 before:bg-login-divider first:before:hidden ${align === "center" ? "text-center" : "text-left"}`;

  return (
    <th scope="col" data-testid={`admin-th-${col}`} aria-sort={ariaSort} className={th}>
      {sortKey === undefined ? (
        <Lines label={label} col={col} />
      ) : (
        <Link
          href={adminUsersHref({ ...filters, sort: sortKey, dir: sortedHere && filters.dir === "desc" ? "asc" : "desc", page: 1 })}
          prefetch={false}
          data-testid={`admin-sort-${col}`}
          className={`flex min-h-11 items-center gap-2 rounded md:min-h-0 ${FOCUS_ON_DARK}`}
        >
          <span className="shrink-0">
            <span className="sr-only">{sortByLabel} </span>
            <Lines label={label} sum={sum} col={col} />
          </span>
          <Sorter direction={direction} />
        </Link>
      )}
    </th>
  );
}
