/*
 * Admin - User (Figma 773:26403, MoMorph -u1lKib0JL). VI strings are the Figma text verbatim (the column titles are English
 * in the design, so they stay English in both locales). Lines marked "not from Figma" have no design text: the frame has no
 * confirm dialog, error or empty state, pagination or mobile layout. `{count}` / `{name}` / `{page}` are filled at render time.
 * `\n` in a column title is the design's own line break. The English file mirrors this shape.
 */
export const admin = {
  metaTitle: /* not from Figma */ "Admin - User",
  header: {
    label: "Admin",
    navAriaLabel: /* not from Figma */ "Quản trị",
    tabs: { overview: "Overview", review: "Review content", user: "User", settings: "Settings" },
  },
  title: "User",
  exportLabel: "Export",
  filters: {
    ariaLabel: /* not from Figma */ "Bộ lọc người dùng",
    unit: { label: "Unit", placeholder: "Chọn phòng ban", listLabel: /* not from Figma */ "Phòng ban" },
    level: { label: "Level", placeholder: "Chọn Level", listLabel: /* not from Figma */ "Level" },
    role: { label: "Role", placeholder: "Chọn Role", listLabel: /* not from Figma */ "Vai trò" },
    all: /* not from Figma */ "Tất cả",
    /* not from Figma: the Hero tiers of lib/kudos/hero-title.ts */
    levels: { "0": "0 · Chưa có", "1": "1 · New", "2": "2 · Rising", "3": "3 · Super", "4": "4 · Legend" },
    search: {
      placeholder: "Search",
      label: /* not from Figma */ "Tìm theo tên hoặc email",
      submit: /* not from Figma */ "Tìm kiếm",
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
    sortBy: /* not from Figma */ "Sắp xếp theo",
    roles: { user: "User", admin: "Admin" },
    empty: /* not from Figma */ "-",
  },
  rowActions: {
    label: /* not from Figma */ "Hành động cho {name}",
    self: /* not from Figma */ "Không thể đổi vai trò của chính bạn",
    toAdmin: /* not from Figma */ "Đổi thành Admin",
    toUser: /* not from Figma */ "Đổi thành User",
  },
  roleDialog: {
    title: /* not from Figma */ "Đổi vai trò người dùng?",
    toAdmin: /* not from Figma */ "Người dùng này sẽ có quyền Admin.",
    toUser: /* not from Figma */ "Người dùng này sẽ không còn quyền Admin.",
    cancel: /* not from Figma */ "Hủy",
    confirm: /* not from Figma */ "Xác nhận",
    updated: /* not from Figma */ "Đã cập nhật vai trò.",
    failed: /* not from Figma */ "Không đổi được vai trò, vui lòng thử lại.",
  },
  listError: /* not from Figma */ "Không tải được danh sách người dùng, vui lòng thử lại.",
  emptyState: {
    title: /* not from Figma */ "Không có người dùng phù hợp",
    reset: /* not from Figma */ "Xoá bộ lọc",
    firstPage: /* not from Figma */ "Về trang 1",
  },
  pagination: {
    ariaLabel: /* not from Figma */ "Phân trang",
    total: /* not from Figma */ "{count} người dùng",
    prev: /* not from Figma */ "Trang trước",
    next: /* not from Figma */ "Trang sau",
    page: /* not from Figma */ "Trang {page}",
  },
};
