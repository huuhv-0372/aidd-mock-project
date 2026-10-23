import type { Dictionary } from "../vi";

/* English mirror of messages/vi/admin.ts. Figma has no English frame: placeholders and every other line are "not from Figma". */
export const admin: Dictionary["admin"] = {
  metaTitle: /* not from Figma */ "Admin - User",
  header: {
    label: "Admin",
    navAriaLabel: /* not from Figma */ "Admin",
    tabs: { overview: "Overview", review: "Review content", user: "User", settings: "Settings" },
  },
  title: "User",
  exportLabel: "Export",
  filters: {
    ariaLabel: /* not from Figma */ "User filters",
    unit: { label: "Unit", placeholder: /* not from Figma */ "Select unit", listLabel: /* not from Figma */ "Unit" },
    level: { label: "Level", placeholder: /* not from Figma */ "Select level", listLabel: /* not from Figma */ "Level" },
    role: { label: "Role", placeholder: /* not from Figma */ "Select role", listLabel: /* not from Figma */ "Role" },
    all: /* not from Figma */ "All",
    levels: { "0": "0 · None", "1": "1 · New", "2": "2 · Rising", "3": "3 · Super", "4": "4 · Legend" },
    search: {
      placeholder: "Search",
      label: /* not from Figma */ "Search by name or email",
      submit: /* not from Figma */ "Search",
    },
  },
  table: {
    columns: {
      id: "ID",
      user: "User",
      email: "Email",
      sent: "∑ sent\nKudos",
      received: "∑ Received\nKudos",
      hearts: "Total\nHeart",
      level: "Level",
      badges: "Number\nof Badges",
      time6: "Time to get\n6 Badges",
      lastLogin: "Last\nLogged in",
      role: "Role",
      actions: "Actions",
    },
    sortBy: /* not from Figma */ "Sort by",
    roles: { user: "User", admin: "Admin" },
    empty: /* not from Figma */ "-",
  },
  rowActions: {
    label: /* not from Figma */ "Actions for {name}",
    self: /* not from Figma */ "You can't change your own role",
    toAdmin: /* not from Figma */ "Change to Admin",
    toUser: /* not from Figma */ "Change to User",
  },
  roleDialog: {
    title: /* not from Figma */ "Change this user's role?",
    toAdmin: /* not from Figma */ "This user will become an Admin.",
    toUser: /* not from Figma */ "This user will no longer be an Admin.",
    cancel: /* not from Figma */ "Cancel",
    confirm: /* not from Figma */ "Confirm",
    updated: /* not from Figma */ "Role updated.",
    failed: /* not from Figma */ "Couldn't change the role, please try again.",
  },
  listError: /* not from Figma */ "Couldn't load the user list, please try again.",
  emptyState: {
    title: /* not from Figma */ "No users match",
    reset: /* not from Figma */ "Clear filters",
    firstPage: /* not from Figma */ "Back to page 1",
  },
  pagination: {
    ariaLabel: /* not from Figma */ "Pagination",
    total: /* not from Figma */ "{count} users",
    prev: /* not from Figma */ "Previous page",
    next: /* not from Figma */ "Next page",
    page: /* not from Figma */ "Page {page}",
  },
};
