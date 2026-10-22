import { Suspense, type ReactNode } from "react";
import { KUDOS_PAGE_ALERT_CARD, KudosKvBackdrop } from "@/components/kudos/kudos-kv-backdrop";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { SiteFooter } from "@/components/site-shell/site-footer";
import { SiteHeader } from "@/components/site-shell/site-header";
import type { Locale } from "@/lib/i18n/locales";
import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";

/*
 * Page around both Profile frames (Figma 362:5037 own, 362:5097 another Sunner, 1440 wide). Behind the header and the hero sits the
 * Kudos key-visual band (KudosKvBackdrop with the Profile cover gradient, which fades the band into the page colour). The content
 * is one 680px column (every Figma block is 680 wide). From lg the avatar's top edge is 184px below the page top (Figma `Frame 532` at y=184): the sticky header takes 80
 * of them, `lg:pt-[104px]` the rest. Header and footer both mark "Sun* Kudos" as the current page (Figma shows it selected in both).
 * `overflow-x-clip` (not a scroll container, so the sticky header still sticks) keeps a hidden hero tooltip from widening a phone page.
 * No floating Write-KUDOS widget: the design has none. The footer brings its own top margin (125px at xl, Figma 120px).
 */
export function ProfilePageLayout({
  locale,
  shell,
  children,
}: {
  locale: Locale;
  shell: Dictionary["shell"];
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip bg-login-bg font-montserrat">
      <KudosKvBackdrop cover="profile" preload />
      <SiteHeader
        activeHref={SUN_KUDOS_PATH}
        locale={locale}
        copy={shell}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls copy={shell} />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col items-center px-4 pt-10 md:px-12 lg:pt-[104px]">
        <div className={`flex w-full max-w-[680px] flex-col ${KUDOS_PAGE_ALERT_CARD}`}>{children}</div>
      </main>
      <SiteFooter copy={shell} activeHref={SUN_KUDOS_PATH} />
    </div>
  );
}
