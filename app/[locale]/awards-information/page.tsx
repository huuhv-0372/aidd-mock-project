import type { Metadata } from "next";
import { Suspense } from "react";
import { AwardsHero } from "@/components/awards/awards-hero";
import { AwardsLayout } from "@/components/awards/awards-layout";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { KudosSection } from "@/components/site-shell/kudos-section";
import { SiteFooter } from "@/components/site-shell/site-footer";
import { SiteHeader } from "@/components/site-shell/site-header";
import { WidgetButton } from "@/components/site-shell/widget-button";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { AWARDS_INFORMATION_PATH } from "@/lib/navigation/routes";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.awards.metaTitle };
}

export default async function AwardsInformationPage({ params }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <SiteHeader
        activeHref={AWARDS_INFORMATION_PATH}
        locale={locale}
        copy={dict.shell}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls copy={dict.shell} />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">
        <AwardsHero copy={dict.awards} />
        <AwardsLayout copy={dict.awards} />
        <KudosSection copy={dict.shell} />
      </main>
      <WidgetButton label={dict.shell.widgetLabel} />
      <SiteFooter copy={dict.shell} />
    </div>
  );
}
