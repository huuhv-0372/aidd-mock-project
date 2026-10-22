import { Suspense, type ReactNode } from "react";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { SiteHeader } from "@/components/site-shell/site-header";
import type { Locale } from "@/lib/i18n/locales";
import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";
import { KUDOS_PAGE_ALERT_CARD, KudosKvBackdrop } from "./kudos-kv-backdrop";

/*
 * Page around the View Kudo frame (Figma 520:18779 on the 1440 page). In Figma the frame sits on the Sun* Kudos page under an
 * 80% #00101A overlay (owner export, 2026-10-21), so the backdrop is the board's key-visual band (KudosKvBackdrop, same as
 * KudosKvBanner) with its `dimmed` overlay. The shared header is dimmed by the same overlay (owner decision, still
 * clickable), and the 680px frame is centred right under it. No footer and no Write-KUDOS widget: the design has neither.
 */
export function KudoDetailLayout({
  locale,
  shell,
  children,
}: {
  locale: Locale;
  shell: Dictionary["shell"];
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <KudosKvBackdrop dimmed />
      <SiteHeader
        activeHref={SUN_KUDOS_PATH}
        dimmed
        locale={locale}
        copy={shell}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls copy={shell} />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col items-center px-4 pt-4 pb-10 md:pb-20 lg:pt-0">
        <div className={`w-full md:max-w-[680px] ${KUDOS_PAGE_ALERT_CARD}`}>{children}</div>
      </main>
    </div>
  );
}
