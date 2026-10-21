import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { SiteHeader } from "@/components/site-shell/site-header";
import type { Locale } from "@/lib/i18n/locales";
import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";

/* The load-error line of the page is a bare `<p role="alert">`: dress it as a cream card so it reads on the dark page. */
const ALERT_CARD =
  "[&>[role=alert]]:rounded-3xl [&>[role=alert]]:bg-kudos-card [&>[role=alert]]:p-10 [&>[role=alert]]:text-center [&>[role=alert]]:text-base [&>[role=alert]]:leading-6 [&>[role=alert]]:font-bold [&>[role=alert]]:text-login-bg";

/*
 * Page around the View Kudo frame (Figma 520:18779 on the 1440 page). In Figma the frame sits on the Sun* Kudos page under an
 * 80% #00101A overlay (owner export, 2026-10-21), so the backdrop is the board's key-visual band (same image, size and Cover
 * gradient as KudosKvBanner) under that overlay. The shared header is dimmed by the same overlay (owner decision, still
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[432px] overflow-hidden lg:h-[512px]">
        <Image
          src="/images/kudos/kv-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[75%_50%] lg:object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-[957px] bg-[linear-gradient(25deg,#00101a_14.74%,rgb(0_19_32/0)_47.8%)]" />
        <div className="absolute inset-0 bg-[rgb(0_16_26/0.8)]" />
      </div>
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
        <div className={`w-full md:max-w-[680px] ${ALERT_CARD}`}>{children}</div>
      </main>
    </div>
  );
}
