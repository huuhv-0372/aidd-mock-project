import {
  AWARDS_INFORMATION_PATH,
  HOME_PATH,
  STANDARDS_PATH,
  SUN_KUDOS_PATH,
} from "@/lib/navigation/routes";

/*
 * Homepage copy taken from the Figma node tree (MoMorph i87tDx10uM), with two deliberate
 * corrections of obvious Figma typos so the strings match the pinned selector contract:
 * "Award Information" -> "Awards Information" and "Comming soon" -> "Coming soon".
 */

export const LOGO_ALT = "Sun* Annual Awards 2025";

export const NAV_LINKS = [
  { label: "About SAA 2025", href: HOME_PATH },
  { label: "Awards Information", href: AWARDS_INFORMATION_PATH },
  { label: "Sun* Kudos", href: SUN_KUDOS_PATH },
] as const;

export const FOOTER_LINKS = [
  ...NAV_LINKS,
  { label: "Tiêu chuẩn chung", href: STANDARDS_PATH },
] as const;

export const COMING_SOON = "Coming soon";

/* mm:2167:9053 — values are Figma's placeholder event info. */
export const EVENT_INFO = {
  time: { label: "Thời gian:", value: "26/12/2025" },
  venue: { label: "Địa điểm:", value: "Âu Cơ Art Center" },
  broadcast: "Tường thuật trực tiếp qua sóng Livestream",
} as const;

export const FOOTER_COPYRIGHT = "Bản quyền thuộc về Sun* © 2025";

export const KUDOS_COPY = {
  eyebrow: "Phong trào ghi nhận",
  title: "Sun* Kudos",
  body: "ĐIỂM MỚI CỦA SAA 2025\nHoạt động ghi nhận và cảm ơn đồng nghiệp - lần đầu tiên được diễn ra dành cho tất cả Sunner. Hoạt động sẽ được triển khai vào tháng 11/2025, khuyến khích người Sun* chia sẻ những lời ghi nhận, cảm ơn đồng nghiệp trên hệ thống do BTC công bố. Đây sẽ là chất liệu để Hội đồng Heads tham khảo trong quá trình lựa chọn người đạt giải.",
} as const;
