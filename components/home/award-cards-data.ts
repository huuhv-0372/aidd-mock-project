import type { AwardSlug } from "@/lib/navigation/routes";

export type AwardCardData = {
  slug: AwardSlug;
  /** Figma "Awards-Name" export: natural size, rendered at width/336 of the tile. */
  name: { src: string; width: number; height: number };
};

/*
 * Structure of the Figma award instances (mm:2167:9075 .. 2167:9081); title and description text come
 * from the dictionary (`home.awardCards[slug]`). Per-card media:
 * mm:I2167:9075;214:1019;214:666;10:951  mm:I2167:9076;214:1019;214:666;214:654
 * mm:I2167:9077;214:1019;214:666;214:655 mm:I2167:9079;214:1019;214:666;214:656
 * mm:I2167:9080;214:1019;214:666;214:657 mm:I2167:9081;214:1019;214:666;214:653
 * Shared tile background: mm:I2167:9075;214:1019;81:2442 (identical in all six cards).
 */
export const AWARD_CARDS: readonly AwardCardData[] = [
  { slug: "top-talent", name: { src: "/images/home/award-name-top-talent.png", width: 222, height: 36 } },
  { slug: "top-project", name: { src: "/images/home/award-name-top-project.png", width: 232, height: 35 } },
  {
    slug: "top-project-leader",
    name: { src: "/images/home/award-name-top-project-leader.png", width: 232, height: 64 },
  },
  { slug: "best-manager", name: { src: "/images/home/award-name-best-manager.png", width: 232, height: 30 } },
  {
    slug: "signature-2025-creator",
    name: { src: "/images/home/award-name-signature-2025-creator.png", width: 232, height: 54 },
  },
  { slug: "mvp", name: { src: "/images/home/award-name-mvp.png", width: 116, height: 52 } },
];
