import type { Metadata } from "next";
import { Suspense } from "react";
import { AwardsSection } from "@/components/home/awards-section";
import { HomeCountdown } from "@/components/home/home-countdown";
import { HomeCountdownLive } from "@/components/home/home-countdown-live";
import { SiteFooter } from "@/components/site-shell/site-footer";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { SiteHeader } from "@/components/site-shell/site-header";
import { HomeHero } from "@/components/home/home-hero";
import { KudosSection } from "@/components/site-shell/kudos-section";
import { RootFurtherContent } from "@/components/home/root-further-content";
import { WidgetButton } from "@/components/site-shell/widget-button";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { HOME_PATH } from "@/lib/navigation/routes";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.home.metaTitle };
}

export default async function HomePage({ params }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <SiteHeader
        activeHref={HOME_PATH}
        locale={locale}
        copy={dict.shell}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls copy={dict.shell} />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">
        <HomeHero
          copy={dict.home}
          countdown={
            <Suspense fallback={<HomeCountdown days="00" hours="00" minutes="00" showComingSoon={false} />}>
              <HomeCountdownLive />
            </Suspense>
          }
        />
        <RootFurtherContent copy={dict.home.rootFurther} />
        <AwardsSection copy={dict.home} detailsLabel={dict.shell.details} />
        <KudosSection copy={dict.shell} />
      </main>
      <WidgetButton label={dict.shell.widgetLabel} />
      <SiteFooter copy={dict.shell} />
    </div>
  );
}
