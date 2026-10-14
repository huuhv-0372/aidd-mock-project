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
import { AWARDS_INFORMATION_PATH } from "@/lib/navigation/routes";

export const metadata: Metadata = {
  title: "Hệ thống giải thưởng SAA 2025",
};

export default function AwardsInformationPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <SiteHeader
        activeHref={AWARDS_INFORMATION_PATH}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">
        <AwardsHero />
        <AwardsLayout />
        <KudosSection />
      </main>
      <WidgetButton />
      <SiteFooter />
    </div>
  );
}
