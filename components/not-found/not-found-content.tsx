"use client";

import { ErrorScreen } from "@/components/errors/error-screen";
import { useErrorCopy } from "@/components/errors/use-error-copy";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/messages/vi";

/* 404 page (Figma 1378:5063): the title is shown uppercase by CSS, so VI "Không tìm thấy trang" matches the Figma "NOT FOUND". */
export function NotFoundContent({ copy }: { copy: Record<Locale, Dictionary["notFound"]> }) {
  const text = useErrorCopy(copy);
  return (
    <ErrorScreen
      title={text.title}
      body={text.body}
      homeLabel={text.homeLink}
      illustrationSrc="/images/errors/not-found-robot.png"
      uppercaseTitle
    />
  );
}
