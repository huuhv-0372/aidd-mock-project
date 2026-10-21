import type { Dictionary } from "../vi";
import { awardSections } from "./award-sections";

export const awards: Dictionary["awards"] = {
  metaTitle: "Award System | SAA 2025",
  keyvisualAlt: "Keyvisual Sun* Annual Award 2025",
  /* Same casing as vi (proper name, identical in both locales); the MoMorph EN entry is title case. */
  subtitle: "Sun* annual awards 2025",
  title: "SAA 2025 Award System",
  navAriaLabel: /* not from Figma */ "Award categories",
  quantityLabel: "Number of awards:",
  prizeLabel: "Prize value:",
  prizeOr: "Or",
  sections: awardSections,
};
