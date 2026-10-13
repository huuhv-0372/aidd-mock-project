import type { Metadata } from "next";
import { Suspense } from "react";
import { AwardsSection } from "@/components/home/awards-section";
import { HomeCountdown } from "@/components/home/home-countdown";
import { HomeCountdownLive } from "@/components/home/home-countdown-live";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { HomeHero } from "@/components/home/home-hero";
import { KudosSection } from "@/components/home/kudos-section";
import { RootFurtherContent } from "@/components/home/root-further-content";
import { SignOutForm } from "@/components/home/sign-out-form";
import { WidgetButton } from "@/components/home/widget-button";

export const metadata: Metadata = {
  title: "SAA 2025",
};

export default function HomePage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <HomeHeader signOutSlot={<SignOutForm />} />
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
      <HomeFooter />
    </div>
  );
}
