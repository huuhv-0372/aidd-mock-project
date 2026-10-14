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
import { HOME_PATH } from "@/lib/navigation/routes";

export const metadata: Metadata = {
  title: "SAA 2025",
};

export default function HomePage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <SiteHeader
        activeHref={HOME_PATH}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">
        <HomeHero
          countdown={
            <Suspense fallback={<HomeCountdown days="00" hours="00" minutes="00" showComingSoon={false} />}>
              <HomeCountdownLive />
            </Suspense>
          }
        />
        <RootFurtherContent />
        <AwardsSection />
        <KudosSection />
      </main>
      <WidgetButton />
      <SiteFooter />
    </div>
  );
}
