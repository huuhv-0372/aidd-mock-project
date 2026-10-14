import type { AwardSlug } from "@/lib/navigation/routes";
import { rootFurther } from "./root-further";

export type AwardCardCopy = { title: string; description: string };

const awardCards: Record<AwardSlug, AwardCardCopy> = {
  "top-talent": {
    title: "Top Talent",
    description: "Vinh danh top cá nhân xuất sắc trên mọi phương diện",
  },
  "top-project": {
    title: "Top Project",
    description: "Vinh danh dự án xuất sắc trên mọi phương diện, dự án có doanh thu nổi bật",
  },
  "top-project-leader": {
    title: "Top Project Leader",
    description: "Vinh danh người quản lý truyền cảm hứng và dẫn dắt dự án bứt phá,",
  },
  "best-manager": {
    title: "Best Manager",
    description: "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
  },
  "signature-2025-creator": {
    title: "Signature 2025 - Creator",
    description: "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
  },
  mvp: {
    title: "MVP (Most Valuable Person)",
    description: "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
  },
};

export const home = {
  metaTitle: "SAA 2025",
  cta: { awards: "ABOUT AWARDS", kudos: "ABOUT KUDOS" },
  /* mm:2167:9053 — values are Figma's placeholder event info. */
  eventInfo: {
    time: { label: "Thời gian:", value: "26/12/2025" },
    venue: { label: "Địa điểm:", value: "Âu Cơ Art Center" },
    broadcast: "Tường thuật trực tiếp qua sóng Livestream",
  },
  awardsSection: {
    eyebrow: "Sun* annual awards 2025",
    title: "Hệ thống giải thưởng",
  },
  awardCards,
  rootFurther,
};
