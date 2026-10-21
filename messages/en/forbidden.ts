import type { Dictionary } from "../vi";

/* Figma 2182:9291 supplies only the title ("Access Denied"); its description is the 404 sentence copied by mistake. */
export const forbidden: Dictionary["forbidden"] = {
  metaTitle: /* not from Figma */ "Access denied | SAA 2025",
  title: "Access Denied",
  body: /* not from Figma */ "You don’t have permission to access this page.",
  homeLink: /* not from Figma */ "Back to home",
};
