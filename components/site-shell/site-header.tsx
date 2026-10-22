import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSelector } from "@/components/ui/language-selector";
import type { Locale } from "@/lib/i18n/locales";
import { HOME_PATH } from "@/lib/navigation/routes";
import { FOCUS_RING, GLOW_ON_HOVER, GLOW_WHEN_CURRENT } from "./shell-class-names";
import { getNavLinks, type ShellCopy } from "./shell-links";
import { HomeLink } from "./home-link";

const NAV_LINK_BASE = `flex min-h-11 items-center rounded border-b border-transparent px-2 text-sm leading-5 font-bold tracking-[0.1px] text-white hover:bg-[rgb(255_234_158/0.1)] ${GLOW_ON_HOVER} aria-[current=page]:border-login-accent aria-[current=page]:text-login-accent ${GLOW_WHEN_CURRENT} lg:p-4 motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`;

/*
 * Below lg the nav drops to its own row and the header scrolls away; sticky from lg up.
 * `controls` is the session-dependent part (bell + account menu, or the guest login link); its items
 * are direct flex children of the right group (no wrapper) and place themselves with `order`:
 * bell 1, language 2 (always rendered, static), account / login link 3 = Figma order bell, VN, profile.
 * `dimmed` (View Kudo, Figma 520:18779): the bar sits under the page's 80% #00101A overlay; the overlay is z-20 inside the
 * header, so the open language list (z-30) and account panel (z-40) stay bright, and it never takes a click.
 */
export function SiteHeader({
  controls,
  activeHref,
  locale,
  copy,
  dimmed = false,
}: {
  dimmed?: boolean;
  controls: ReactNode;
  activeHref: string;
  locale: Locale;
  copy: ShellCopy;
}) {
  return (
    // mm:2167:9091
    <header className="relative z-30 w-full bg-home-header-bg font-montserrat lg:sticky lg:top-0">
      <div className="mx-auto flex w-full max-w-[1512px] flex-wrap items-center gap-x-4 px-4 py-3 md:px-12 lg:flex-nowrap lg:gap-x-16 xl:px-36">
        {/* mm:I2167:9091;178:1033 */}
        <HomeLink className={`order-1 flex h-12 shrink-0 items-center rounded ${FOCUS_RING}`}>
          {/* mm:I2167:9091;178:1033;178:1030 */}
          <Image src="/images/home/logo-header.png" alt={copy.logoAlt} width={52} height={48} sizes="52px" />
        </HomeLink>
        {/* mm:I2167:9091;178:653 */}
        <nav aria-label={copy.nav.ariaLabel} className="order-3 flex w-full flex-wrap justify-center gap-1 lg:order-2 lg:w-auto lg:justify-start lg:gap-6">
          {getNavLinks(copy).map(({ label, href }) => {
            const props = {
              "aria-current": href === activeHref ? ("page" as const) : undefined,
              className: NAV_LINK_BASE,
              children: label,
            };
            return href === HOME_PATH ? (
              <HomeLink key={href} {...props} />
            ) : (
              <Link key={href} href={href} {...props} />
            );
          })}
        </nav>
        {/* mm:I2167:9091;186:1601 */}
        <div className="order-2 ml-auto flex items-center gap-1 lg:order-3 lg:gap-4">
          <div className="order-2">
            <LanguageSelector locale={locale} listLabel={copy.languageListLabel} />
          </div>
          {controls}
        </div>
      </div>
      {dimmed && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[rgb(0_16_26/0.8)]" />}
    </header>
  );
}
