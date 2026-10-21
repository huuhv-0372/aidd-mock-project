import type { Dictionary } from "../vi";
import { rootFurther } from "./root-further";

export const home: Dictionary["home"] = {
  metaTitle: "Home | SAA 2025",
  cta: { awards: "ABOUT AWARDS", kudos: "ABOUT KUDOS" },
  eventInfo: {
    time: { label: "Time:", value: "26/12/2025" },
    venue: { label: "Venue:", value: "Âu Cơ Art Center" },
    broadcast: "Live coverage via Livestream",
  },
  awardsSection: {
    /* Same casing as vi (proper name, identical in both locales); the MoMorph EN entry is title case. */
    eyebrow: "Sun* annual awards 2025",
    title: "Awards System",
  },
  awardCards: {
    "top-talent": {
      title: "Top Talent",
      description: "Honoring top individuals across all aspects",
    },
    "top-project": {
      title: "Top Project",
      description: "Honoring top projects across all aspects, especially those with outstanding revenue",
    },
    "top-project-leader": {
      title: "Top Project Leader",
      description: "Honoring inspiring managers who lead innovative project breakthroughs",
    },
    "best-manager": {
      title: "Best Manager",
      description: "Honoring managers with strong management skills leading their teams",
    },
    "signature-2025-creator": {
      title: "Signature 2025 - Creator",
      description: "Honoring managers with strong management skills leading their teams",
    },
    mvp: {
      title: "MVP (Most Valuable Person)",
      description: "Honoring managers with strong management skills leading their teams",
    },
  },
  rootFurther,
};
