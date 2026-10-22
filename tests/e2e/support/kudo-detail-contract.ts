// View Kudo (MoMorph onDIohs2bS, Figma 520:18779) selector + copy contract for kudo-detail.spec.ts.
// Route /sun-kudos/{id}. The frame is the only new testid; the rest reuse the board's card testids (kudo-title,
// kudo-content, kudo-hearts, kudo-image, kudo-hashtag). Fixtures: kudos-fixtures.mjs (DETAIL_KUDO is kudo_detail-only).
// Plan: plans/261021-view-kudo/plan.md (phase 02a owns the frame and the Đóng button).

export const DETAIL = {
  frame: "kudo-detail", // new: the Kudo frame (680px card on the page); everything below sits inside it
  title: { vi: "Chi tiết Kudo | SAA 2025", en: "Kudo details | SAA 2025" },
  close: { vi: "Đóng", en: "Close" }, // button; VI goes back in history when the previous page is same-site, else /sun-kudos
  copyLink: "Copy Link",
  notFoundHeading: "Không tìm thấy trang", // the existing 404 page's h1
  loginButton: "LOGIN With Google",
} as const;

export const detailPath = (id: string) => `/sun-kudos/${id}`;
