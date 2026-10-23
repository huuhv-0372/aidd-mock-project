// Admin - User (plans/261023-1207-admin-user-management, phase 01): the single source of selectors and copy for the admin
// E2E specs. Phase 02a (UI) and 02b (data) read this file and must not rename anything here. Only the e2e owner edits it.
// Strings from the Figma frame (figma/admin-user-773-26403.png) are plain; every other string is marked "not from Figma".
// The UI renders these testids on the elements named below. Where a testid sits on a wrapper, the spec reads its text.
import { ADMIN_EXPORT_MAX_ROWS, ADMIN_PAGE_SIZE, ADMIN_SEARCH_MAX_LENGTH } from "../../../lib/admin/admin-user-types";

export type Locale = "vi" | "en";
export type TabKey = "overview" | "review" | "user" | "settings";
export type FilterName = "unit" | "level" | "role";
export type ColumnKey = "id" | "user" | "email" | "sent" | "received" | "hearts" | "level" | "badges" | "time6" | "last-login" | "role" | "actions";

export const TAB_KEYS: TabKey[] = ["overview", "review", "user", "settings"];
export const FILTER_NAMES: FilterName[] = ["unit", "level", "role"];

/** data-testid values. `admin-*` prefix. Functions return the id for dynamic parts. */
export const TID = {
  // Header: <header data-testid=header>, label "Admin" inside it. Tabs: <a> for "User" (aria-current="page"),
  // <span aria-disabled="true"> without href for the other three.
  header: "admin-header",
  headerLabel: "admin-header-label",
  tab: (key: TabKey) => `admin-tab-${key}`,
  title: "admin-title", // <h1>, text "User"
  exportLink: "admin-export", // <a href="/admin/users/export?..."> text "Export"
  // Filter triggers: <button aria-haspopup="listbox" aria-expanded>. Visible text = placeholder when unset, else the option label.
  filter: (name: FilterName) => `admin-filter-${name}`,
  filterListbox: (name: FilterName) => `admin-filter-${name}-listbox`, // role="listbox", shown while open
  // Options: role="option". value = unit code | level 0..4 | role user|admin. "all" = clear that filter.
  filterOption: (name: FilterName, value: string) => `admin-filter-${name}-option-${value}`,
  search: "admin-search", // <input type="search"> placeholder "Search"
  searchSubmit: "admin-search-submit", // magnifier button, submits the query now
  tableScroll: "admin-table-scroll", // div around the table: overflow-x auto
  table: "admin-table", // <table>
  th: (col: ColumnKey) => `admin-th-${col}`, // <th scope=col>; sortable ones carry aria-sort
  sort: (col: ColumnKey) => `admin-sort-${col}`, // <a> inside a sortable th, href = adminUsersHref(sort/dir)
  sum: (col: "sent" | "received") => `admin-sum-${col}`, // element holding "(N)": sum over the whole filtered result
  row: "admin-row", // <tr data-user-id="<uuid>">
  cell: (col: ColumnKey) => `admin-cell-${col}`, // <td>; for hearts the testid sits on the element holding the number
  cellDate: (col: "time6" | "last-login") => `admin-cell-${col}-date`, // "dd/MM/yyyy", only when the value is not null
  cellTime: (col: "time6" | "last-login") => `admin-cell-${col}-time`, // "HH:mm", only when the value is not null
  rowActions: "admin-row-actions", // <button aria-haspopup="menu">, disabled on the viewer's own row
  roleMenu: "admin-role-menu", // role="menu"
  roleItem: "admin-role-item", // role="menuitem", one per row menu
  roleDialog: "admin-role-dialog", // native <dialog>, role dialog, shows the name and the email
  roleConfirm: "admin-role-confirm",
  roleCancel: "admin-role-cancel",
  roleError: "admin-role-error", // role="alert" inside the dialog
  statusToast: "admin-status-toast", // role="status" after a successful change
  listError: "admin-error", // role="alert" for a failed user list read (no table rendered)
  pagination: "admin-pagination", // <nav>
  total: "admin-total", // text "45 người dùng" / "45 users": the whole filtered result
  pagePrev: "admin-page-prev", // <a> or, when unavailable, <span aria-disabled="true"> without href
  pageNext: "admin-page-next",
  page: (n: number) => `admin-page-${n}`, // <a href> ; the current page has aria-current="page"
  empty: "admin-empty", // no rows for the filters or for an out-of-range page
  emptyReset: "admin-empty-reset", // <a> href = ADMIN_USERS_PATH (clears every filter)
  emptyFirstPage: "admin-empty-first-page", // <a> href = same filters, page=1
  footer: "admin-footer", // <footer> with the copyright line
  accountDashboard: "admin-account-dashboard", // <a role="menuitem" href="/admin">, only for admins
} as const;

/** Table columns in order. `sort` = the sort key in the URL (`sort=`), null when the column is not sortable. */
export const COLUMNS: { key: ColumnKey; label: string; sort: string | null }[] = [
  { key: "id", label: "ID", sort: null },
  { key: "user", label: "User", sort: null },
  { key: "email", label: "Email", sort: null },
  { key: "sent", label: "∑ sent Kudos", sort: "sent" },
  { key: "received", label: "∑ Received Kudos", sort: "received" },
  { key: "hearts", label: "Total Heart", sort: "hearts" },
  { key: "level", label: "Level", sort: "level" },
  { key: "badges", label: "Number of Badges", sort: "badges" },
  { key: "time6", label: "Time to get 6 Badges", sort: "time6" },
  { key: "last-login", label: "Last Logged in", sort: "last_login" },
  { key: "role", label: "Role", sort: null },
  { key: "actions", label: "Actions", sort: null },
];

/** The URL state, parameter names exactly as in lib/admin/admin-user-types.ts (ADMIN_USER_SORT_KEYS, dir asc|desc). */
export const URL_PARAM = { unit: "unit", level: "level", role: "role", q: "q", sort: "sort", dir: "dir", page: "page" } as const;

export const PAGE_SIZE = ADMIN_PAGE_SIZE; // 20
export const SEARCH_MAX = ADMIN_SEARCH_MAX_LENGTH; // 100
export const EXPORT_MAX = ADMIN_EXPORT_MAX_ROWS; // 5000
export const EXPORT_FILENAME = /^users-\d{8}\.csv$/;
/** CSV header, English and fixed in both locales (clarifications: CSV columns are not localised). */
export const CSV_HEADER = ["ID", "Name", "Email", "Sent Kudos", "Received Kudos", "Total Heart", "Level", "Badges", "Time to get 6 Badges", "Last Logged in", "Role"];

/** The unit code the filter spec picks. Present in kudos-fixtures.mjs DEPARTMENTS, which the fake serves on GET /rest/v1/departments. */
export const UNIT_CODE = "CEVC2";

/** Visible copy. Keys are the locale. Figma text carries no comment; everything else says "not from Figma". */
export const COPY = {
  headerLabel: { vi: "Admin", en: "Admin" },
  tabs: {
    overview: { vi: "Overview", en: "Overview" },
    review: { vi: "Review content", en: "Review content" },
    user: { vi: "User", en: "User" },
    settings: { vi: "Settings", en: "Settings" },
  },
  title: { vi: "User", en: "User" },
  exportLabel: { vi: "Export", en: "Export" },
  filterLabel: { unit: "Unit", level: "Level", role: "Role" }, // same in both locales (Figma)
  filterPlaceholder: {
    unit: { vi: "Chọn phòng ban", en: "Select unit" }, // en: not from Figma
    level: { vi: "Chọn Level", en: "Select level" }, // en: not from Figma
    role: { vi: "Chọn Role", en: "Select role" }, // en: not from Figma
  },
  searchPlaceholder: { vi: "Search", en: "Search" },
  filterAll: { vi: "Tất cả", en: "All" }, // not from Figma: the "clear this filter" option
  levelLabel: {
    // not from Figma: names are the Hero tiers of lib/kudos/hero-title.ts
    0: { vi: "0 · Chưa có", en: "0 · None" },
    1: { vi: "1 · New", en: "1 · New" },
    2: { vi: "2 · Rising", en: "2 · Rising" },
    3: { vi: "3 · Super", en: "3 · Super" },
    4: { vi: "4 · Legend", en: "4 · Legend" },
  },
  roleLabel: { user: { vi: "User", en: "User" }, admin: { vi: "Admin", en: "Admin" } }, // Figma
  footer: { vi: "Bản quyền thuộc về Sun* © 2025", en: "Copyright © Sun* 2025" }, // Figma (shell footer)
  // Role change (not from Figma):
  roleItemToAdmin: { vi: "Đổi thành Admin", en: "Change to Admin" },
  roleItemToUser: { vi: "Đổi thành User", en: "Change to User" },
  selfHint: { vi: "Không thể đổi vai trò của chính bạn", en: "You can't change your own role" }, // aria-label of the disabled button
  dialogTitle: { vi: "Đổi vai trò người dùng?", en: "Change this user's role?" },
  confirm: { vi: "Xác nhận", en: "Confirm" },
  cancel: { vi: "Hủy", en: "Cancel" },
  roleUpdated: { vi: "Đã cập nhật vai trò.", en: "Role updated." },
  // One generic message for every refusal and for a 500. Must not show the raw reason or any server detail.
  roleFailed: { vi: "Không đổi được vai trò, vui lòng thử lại.", en: "Couldn't change the role, please try again." },
  // Lists and empty states (not from Figma):
  listFailed: { vi: "Không tải được danh sách người dùng, vui lòng thử lại.", en: "Couldn't load the user list, please try again." },
  empty: { vi: "Không có người dùng phù hợp", en: "No users match" },
  emptyReset: { vi: "Xoá bộ lọc", en: "Clear filters" },
  emptyFirstPage: { vi: "Về trang 1", en: "Back to page 1" },
  pagePrev: { vi: "Trang trước", en: "Previous page" },
  pageNext: { vi: "Trang sau", en: "Next page" },
  total: { vi: (n: number) => `${n} người dùng`, en: (n: number) => `${n} users` },
  accountDashboard: { vi: "Dashboard", en: "Dashboard" }, // spec 54rekaCHG1, same in both locales
  // The 403 page the layout renders (app/[locale]/forbidden, shared with error-pages.spec.ts).
  forbiddenTitle: { vi: "Truy cập bị từ chối", en: "Access Denied" },
} as const;

/** The level of the Hero tier (plan clarifications: distinct non-anonymous senders). Used by the Level filter option labels. */
export const LEVEL_VALUES = [0, 1, 2, 3, 4] as const;
