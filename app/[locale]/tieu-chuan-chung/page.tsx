import type { Metadata } from "next";
import { Suspense } from "react";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { SiteFooter } from "@/components/site-shell/site-footer";
import { SiteHeader } from "@/components/site-shell/site-header";
import { StandardsContent } from "@/components/standards/standards-content";
import { StandardsHero } from "@/components/standards/standards-hero";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { STANDARDS_PATH } from "@/lib/navigation/routes";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.standards.metaTitle };
}

/* Public page (Figma web 1161:8944). No header item is active (the design has none for it) and no Viết Kudo widget. */
export default async function StandardsPage({ params }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
      <SiteHeader
        activeHref={STANDARDS_PATH}
        locale={locale}
        copy={dict.shell}
        controls={
          <Suspense fallback={<HeaderControlsPlaceholder />}>
            <HeaderSessionControls copy={dict.shell} />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">
        <StandardsHero />
        <StandardsContent copy={dict.standards} />
      </main>
      <SiteFooter copy={dict.shell} activeHref={STANDARDS_PATH} />
    </div>
  );
}
