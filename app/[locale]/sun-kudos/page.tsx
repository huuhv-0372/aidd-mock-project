import type { Metadata } from "next";
import { Suspense } from "react";
import { AllKudosSection } from "@/components/kudos/all-kudos-section";
import { HighlightKudosSection } from "@/components/kudos/highlight-kudos-section";
import { KudosComposeTrigger } from "@/components/kudos/kudos-compose-trigger";
import { KudosKvBanner } from "@/components/kudos/kudos-kv-banner";
import { SpotlightSection } from "@/components/kudos/spotlight-section";
import { SpotlightSkeleton } from "@/components/kudos/spotlight-skeleton";
import { ComposerWidget } from "@/components/kudos-compose/composer-widget";
import { KudosComposer } from "@/components/kudos-compose/kudos-composer";
import { HeaderControlsPlaceholder } from "@/components/site-shell/header-controls-placeholder";
import { HeaderSessionControls } from "@/components/site-shell/header-session-controls";
import { SiteFooter } from "@/components/site-shell/site-footer";
import { SiteHeader } from "@/components/site-shell/site-header";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";
import { fetchKudosSpotlight, getKudosBoardData } from "@/lib/kudos/get-kudos-board-data";
import { loadMoreKudos } from "@/lib/kudos/load-more-kudos-action";
import type { RawSearchParams } from "@/lib/kudos/parse-kudos-filters";
import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.kudos.metaTitle };
}

export default async function SunKudosPage({ params, searchParams }: PageProps) {
  const { locale, dict } = await getRouteDictionary(params);
  const client = await createSupabaseServerClient();
  // Started, not awaited: the Spotlight streams in behind its skeleton instead of holding the whole board back.
  // `fetchKudosSpotlight` never rejects, so the un-awaited promise cannot go unhandled.
  const spotlight = fetchKudosSpotlight(client);
  // One pass for the rest of the board; each block is `null` when it failed and shows its own generic error.
  const board = await getKudosBoardData(await searchParams, client);
  const copy = dict.kudos;
  return (
    <KudosComposer locale={locale} copy={dict.kudosCompose}>
      <div className="relative isolate flex min-h-dvh flex-col bg-login-bg">
        <SiteHeader
          activeHref={SUN_KUDOS_PATH}
          locale={locale}
          copy={dict.shell}
          controls={
            <Suspense fallback={<HeaderControlsPlaceholder />}>
              <HeaderSessionControls copy={dict.shell} />
            </Suspense>
          }
        />
        <main className="flex flex-1 flex-col gap-16 pb-20 lg:pb-[120px]">
          <KudosKvBanner copy={copy.kv}>
            <KudosComposeTrigger copy={copy.compose} />
          </KudosKvBanner>
          <HighlightKudosSection
            kudos={board.highlight}
            hashtags={board.hashtags ?? []}
            departments={board.departments ?? []}
            filters={board.filters}
            locale={locale}
            copy={copy.highlight}
          />
          <Suspense fallback={<SpotlightSkeleton />}>
            <SpotlightSection spotlight={spotlight} copy={copy.spotlight} />
          </Suspense>
          <AllKudosSection
            initialItems={board.feed?.items ?? null}
            initialCursor={board.feed?.nextCursor ?? null}
            filters={board.filters}
            loadMore={loadMoreKudos}
            stats={board.myStats}
            gifts={board.gifts}
            locale={locale}
            copy={copy.allKudos}
          />
        </main>
        <ComposerWidget label={dict.shell.widgetLabel} copy={dict.kudosCompose.widget} />
        <SiteFooter copy={dict.shell} />
      </div>
    </KudosComposer>
  );
}
