import { notFound } from "next/navigation";

/**
 * Catch-all for paths no route matches. The root layout lives in app/[locale], so an unmatched
 * path must still resolve inside it for app/[locale]/not-found.tsx (localised 404) to render.
 */
export default function UnmatchedPage() {
  notFound();
}
