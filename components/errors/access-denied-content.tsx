"use client";

import { ErrorScreen } from "@/components/errors/error-screen";
import { useErrorCopy } from "@/components/errors/use-error-copy";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/messages/vi";

/* 403 page (Figma 2182:9291). Shared by app/[locale]/forbidden.tsx and the /403 route. */
export function AccessDeniedContent({ copy }: { copy: Record<Locale, Dictionary["forbidden"]> }) {
  const text = useErrorCopy(copy);
  return (
    <ErrorScreen
      title={text.title}
      body={text.body}
      homeLabel={text.homeLink}
      illustrationSrc="/images/errors/access-denied-monitor.png"
    />
  );
}
