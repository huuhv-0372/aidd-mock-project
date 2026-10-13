import type { AwardSlug } from "@/lib/navigation/routes";

export type AwardCardData = {
  slug: AwardSlug;
  title: string;
  description: string;
  /** Figma "Awards-Name" export: natural size, rendered at width/336 of the tile. */
  name: { src: string; width: number; height: number };
};

/*
 * Copy verbatim from the Figma award instances (mm:2167:9075 .. 2167:9081). Per-card media:
 * mm:I2167:9075;214:1019;214:666;10:951  mm:I2167:9076;214:1019;214:666;214:654
 * mm:I2167:9077;214:1019;214:666;214:655 mm:I2167:9079;214:1019;214:666;214:656
 * mm:I2167:9080;214:1019;214:666;214:657 mm:I2167:9081;214:1019;214:666;214:653
 * Shared tile background: mm:I2167:9075;214:1019;81:2442 (identical in all six cards).
 */
export const AWARD_CARDS: readonly AwardCardData[] = [
  {
    slug: "top-talent",
    title: "Top Talent",
    description: "Vinh danh top cá nhân xuất sắc trên mọi phương diện",
    name: { src: "/images/home/award-name-top-talent.png", width: 222, height: 36 },
  },
  {
    slug: "top-project",
    title: "Top Project",
    description: "Vinh danh dự án xuất sắc trên mọi phương diện, dự án có doanh thu nổi bật",
    name: { src: "/images/home/award-name-top-project.png", width: 232, height: 35 },
  },
  {
    slug: "top-project-leader",
    title: "Top Project Leader",
    description: "Vinh danh người quản lý truyền cảm hứng và dẫn dắt dự án bứt phá,",
    name: { src: "/images/home/award-name-top-project-leader.png", width: 232, height: 64 },
  },
  {
    slug: "best-manager",
    title: "Best Manager",
    description: "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
    name: { src: "/images/home/award-name-best-manager.png", width: 232, height: 30 },
  },
  {
    slug: "signature-2025-creator",
    title: "Signature 2025 - Creator",
    description: "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
    name: { src: "/images/home/award-name-signature-2025-creator.png", width: 232, height: 54 },
  },
  {
    slug: "mvp",
    title: "MVP (Most Valuable Person)",
    description: "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
    name: { src: "/images/home/award-name-mvp.png", width: 116, height: 52 },
  },
];
