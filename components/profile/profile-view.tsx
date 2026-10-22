import { KudoHeartsProvider } from "@/components/kudos/kudo-hearts-store";
import { KudosStatsPanel } from "@/components/kudos/kudos-stats-panel";
import { KudosComposer } from "@/components/kudos-compose/kudos-composer";
import type { Locale } from "@/lib/i18n/locales";
import { setKudoHeart } from "@/lib/kudos/set-kudo-heart-action";
import type { LoadMoreProfileKudos, ProfilePageData } from "@/lib/profiles/profile-types";
import type { Dictionary } from "@/messages/vi";
import { fill } from "./fill-template";
import { ProfileHero } from "./profile-hero";
import { ProfileIcons } from "./profile-icons";
import { ProfileKudosSection } from "./profile-kudos-section";
import { ProfilePageLayout } from "./profile-page-layout";
import { ProfileWriteBar } from "./profile-write-bar";

/*
 * Both Profile frames (own: Figma 362:5037, another Sunner: 362:5097). Own profile: hero, icons, the 680px statistics card, then
 * KUDOS with its direction dropdown. Another Sunner: hero, icons, the write bar in the card's place, then KUDOS with a static
 * received count. The composer wraps the page so the write bar can open Viết Kudo; the hearts store is shared by every card.
 * Spacing between blocks (Figma): 32px inside the info column, 64px to the statistics card (32px to the write bar, measured on the
 * owner image), 120px to the KUDOS block (80px on a phone).
 */
export function ProfileView({
  data,
  locale,
  dict,
  loadMore,
}: {
  data: Extract<ProfilePageData, { status: "ok" }>;
  locale: Locale;
  dict: Dictionary;
  loadMore: LoadMoreProfileKudos;
}) {
  const { self, person, stats, feed } = data;
  const copy = dict.profile;
  const board = dict.kudos.allKudos;
  const name = person.full_name || copy.unknownName;
  return (
    <KudosComposer locale={locale} copy={dict.kudosCompose}>
      <ProfilePageLayout locale={locale} shell={dict.shell}>
        <KudoHeartsProvider setHeart={setKudoHeart}>
          <div className="flex w-full flex-col items-center gap-8">
            <ProfileHero person={person} name={name} copy={board.card.person} />
            <ProfileIcons title={self ? copy.icons.titleSelf : fill(copy.icons.titleOther, "name", name)} />
            {self ? (
              // mm:362:5073
              <div className="mt-8 w-full">
                <KudosStatsPanel stats={stats} locale={locale} copy={board.stats} spacious />
              </div>
            ) : (
              <ProfileWriteBar recipient={{ id: person.id, name }} label={fill(copy.writeBar, "name", name)} />
            )}
          </div>
          <div className="mt-20 w-full lg:mt-[120px]">
            {/* A new top Kudo (after sending one from the write bar the route refreshes) restarts the section on its first page. */}
            <ProfileKudosSection
              key={`${person.id}|${feed?.items[0]?.id ?? ""}`}
              profileId={person.id}
              self={self}
              receivedCount={person.kudos_received}
              sentCount={stats?.sent ?? null}
              feed={feed}
              loadMore={loadMore}
              locale={locale}
              copy={{
                ...copy.kudos,
                emptyReceived: board.empty,
                listError: board.error,
                feed: board.feed,
                card: board.card,
              }}
            />
          </div>
        </KudoHeartsProvider>
      </ProfilePageLayout>
    </KudosComposer>
  );
}
