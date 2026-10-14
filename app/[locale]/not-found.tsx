import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found/not-found-content";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const copy = { vi: getDictionary("vi").notFound, en: getDictionary("en").notFound };

export const metadata: Metadata = {
  title: copy.vi.metaTitle,
};

/* Shared by every route that does not exist (or is not built yet), so no header/footer and no error details.
 * No params reach a not-found page: both locales' copy go to a client leaf that picks by the locale segment. */
export default function NotFound() {
  return <NotFoundContent copy={copy} />;
}
