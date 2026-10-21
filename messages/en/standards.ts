import type { Dictionary } from "../vi";

/*
 * Only the two titles come from the Figma localization ("Community Standards", "General standards").
 * Everything else is self-translated and marked `not from Figma` (listed in
 * plans/261021-community-standards/reports/en-localizations.md).
 */
export const standards: Dictionary["standards"] = {
  metaTitle: "General standards",
  pageTitle: "General standards",
  community: {
    heading: "Community Standards",
    intro: /* not from Figma */
      "The Community Standards are designed to keep a civil, safe and positive environment for everyone taking part in the Sun* Kudos recognition movement.",
    notice: /* not from Figma */
      "Content found to meet any of the violation criteria below is labelled Spam and hidden automatically by the system.",
    rules: [
      /* not from Figma */ "Uses vulgar or abusive language, or content that is offensive or defamatory.",
      /* not from Figma */ "Mentions political or religious topics, or gender discrimination.",
      /* not from Figma */ "Contains specific figures (revenue, contracts, KPIs, customers, project codes, account numbers…).",
      /* not from Figma */ "Mentions the names of partners, customers or outside organizations.",
      /* not from Figma */ "Contains personal information (email, phone number, address, family details).",
      /* not from Figma */ "Sends 3+ messages with similar content repeatedly within a short time.",
      /* not from Figma */ "Kudos content that is too short (under 30 characters) and has no context (“Thanks a lot”, “Thanks”, “Good job!”).",
      /* not from Figma */ "Sends to too many people or groups within a short time (<3s per message).",
      /* not from Figma */ 'Spam text (only characters such as ".", ",", "...", or characters with no content).',
      /* not from Figma */ "An unusual spike in “hearts” (compared with average user behavior).",
    ],
  },
  security: {
    heading: /* not from Figma */ "Security Standards",
    statement: /* not from Figma */
      "Sunners are committed to protecting information. Every member is responsible for keeping the content shared on the system confidential.",
    items: [
      /* not from Figma */ "Information security: All information Sunners share is kept confidential on the system.",
      /* not from Figma */ "Sharing scope: All personnel and project information in the system is confidential. Sunners should only share it within Sun*.",
    ],
    contact: /* not from Figma */
      "Support contact: For any questions, Sunners please contact the SAA organizing committee representative on Slack: duong.thi.thuy.an.",
  },
};
