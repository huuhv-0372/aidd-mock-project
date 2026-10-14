import type { AwardSectionCopy } from "../vi/award-sections";
import type { AwardSlug } from "@/lib/navigation/routes";

/*
 * EN source: MoMorph `en` entries for Top Talent, Top Project, Top Project Leader and Best Manager;
 * the Signature and MVP paragraphs have no MoMorph entry and are marked "not from Figma".
 */
export const awardSections: Record<AwardSlug, AwardSectionCopy> = {
  "top-talent": {
    navLabel: "Top Talent",
    title: "Top Talent",
    paragraphs: [
      "Top Talent Award recognizing individuals who excel comprehensively – those who constantly affirm their solid professional skills, outstanding work performance, always deliver value beyond expectations, and are highly valued by clients and teammates. With a spirit ready to accept any organizational task, they are always a source of inspiration, motivation, and positive influence on the entire team.",
    ],
    quantityUnit: "Individual",
    prizes: [{ value: "7,000,000 VND", note: "per prize" }],
  },
  "top-project": {
    navLabel: "Top Project",
    title: "Top Project",
    paragraphs: [
      "Top Project Award honoring excellent project teams with business results exceeding expectations, optimized operational efficiency, and dedicated working spirit. These projects are highly complex technically, optimize resource and cost efficiency, propose valuable ideas for clients, generate superior profits, and receive positive feedback. Members strictly adhere to internal development standards, creating a model of excellence and professionalism.",
    ],
    quantityUnit: "Team",
    prizes: [{ value: "15,000,000 VND", note: "per prize" }],
  },
  "top-project-leader": {
    navLabel: "Top Project Leader",
    title: "Top Project Leader",
    paragraphs: [
      "Top Project Leader Award honoring excellent project managers – those who possess strong management skills, powerful inspiration, and a mindset of ‘Aim High – Be Agile’ in any challenge and situation. Under their guidance, team members not only overcome challenges and achieve goals, but also maintain passion, Wasshoi spirit, and grow to become the best version of themselves.",
    ],
    quantityUnit: "Individual",
    prizes: [{ value: "7,000,000 VND", note: "per prize" }],
  },
  "best-manager": {
    navLabel: "Best Manager",
    title: "Best Manager",
    paragraphs: [
      "Best Manager Award honoring outstanding leaders who lead their teams to achieve results beyond expectations. They demonstrate versatile skills, effective coordination, and flexible technology application in the digital age, inspiring the team to be confident, energetic, and even drive revolutionary changes.",
    ],
    quantityUnit: "Individual",
    prizes: [{ value: "10,000,000 VND" }],
  },
  "signature-2025-creator": {
    navLabel: "Signature 2025 - Creator",
    title: "Signature 2025 - Creator",
    paragraphs: [
      /* not from Figma */ "The Signature Award honors an individual or team that embodies the distinctive spirit Sun* aims for in each period.",
      /* not from Figma */ "In 2025, the Signature Award honors the Creator - an individual/team with a proactive and sharp mindset who always sees opportunity in challenge and takes the lead in action. They are people who are sharp about problems, quickly identify them and propose practical solutions that bring clear value to projects, clients or the organization. With the creative mindset and the “Creator” spirit that is distinctive to Sun*, they not only respond positively to change but also proactively create improvements, helping shape new standards for how Sun* people create value.",
    ],
    quantityUnit: "Individual or Team",
    prizes: [
      { value: "5,000,000 VND", note: "for individual award" },
      { value: "8,000,000 VND", note: "for team award" },
    ],
  },
  mvp: {
    navLabel: "MVP",
    title: "MVP (Most Valuable Person)",
    paragraphs: [
      /* not from Figma */ "The MVP Award honors the most outstanding individual of the year – a representative figure standing for the entire Sun* community. They have shown outstanding capability, enduring dedication and far-reaching influence, leaving a strong mark on Sun*'s journey throughout the past year.",
      /* not from Figma */ "Beyond standing out in performance and work results, they are also a source of spreading inspiration – through their thinking, actions and positive influence on the collective. The MVP embodies all the qualities of an excellent Sun* person and also carries a great responsibility: to become the role model representing the people and spirit of Sun*, helping lead the collective to new heights.",
    ],
    quantityUnit: "Individual",
    prizes: [{ value: "15,000,000 VND" }],
  },
};
