import type { AwardSlug } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";
import type { AwardPrizeCopy } from "@/messages/vi/award-sections";

export type AwardSectionData = {
  slug: AwardSlug;
  /** Label in the category menu (C.1-C.6); differs from `title` only for MVP. */
  navLabel: string;
  title: string;
  /** One entry per Figma paragraph (the Figma text uses a double space as the break). */
  paragraphs: readonly string[];
  /** Signature is left aligned in the Figma, every other description is justified. */
  alignLeft?: boolean;
  quantity: { value: string; unit: string };
  prizes: readonly AwardPrizeCopy[];
};

/*
 * Locale-independent structure of the Figma cards D.1-D.6 (mm:313:8467, 313:8468, 313:8469, 313:8470,
 * 313:8471, 313:8510): order, quantity numbers and alignment. All text comes from the dictionary
 * (`awards.sections[slug]`).
 */
const AWARD_SECTION_STRUCTURE: readonly { slug: AwardSlug; quantityValue: string; alignLeft?: boolean }[] = [
  { slug: "top-talent", quantityValue: "10" },
  { slug: "top-project", quantityValue: "02" },
  { slug: "top-project-leader", quantityValue: "03" },
  { slug: "best-manager", quantityValue: "01" },
  { slug: "signature-2025-creator", quantityValue: "01", alignLeft: true },
  { slug: "mvp", quantityValue: "01" },
];

export function getAwardSections(copy: Dictionary["awards"]): AwardSectionData[] {
  return AWARD_SECTION_STRUCTURE.map(({ slug, quantityValue, alignLeft }) => {
    const { navLabel, title, paragraphs, quantityUnit, prizes } = copy.sections[slug];
    return { slug, navLabel, title, paragraphs, alignLeft, quantity: { value: quantityValue, unit: quantityUnit }, prizes };
  });
}

export function getAwardNavItems(sections: readonly AwardSectionData[]) {
  return sections.map(({ slug, navLabel }) => ({ slug, label: navLabel }));
}
