import type { Locale } from "@/lib/i18n/locales";
import type { Department, Hashtag, KudoRow } from "@/lib/kudos/kudo-types";
import type { KudosFilters } from "@/lib/validation/kudos";
import { HighlightCarousel, type HighlightCarouselCopy } from "./highlight-carousel";
import { KudoHighlightCard, type KudoHighlightCardCopy } from "./kudo-highlight-card";
import { KudosFilterDropdown } from "./kudos-filter-dropdown";
import { KudosSectionHeader } from "./kudos-section-header";

export type HighlightKudosCopy = {
  eyebrow: string;
  title: string;
  empty: string;
  /** Generic text shown when the highlight block failed to load. */
  error: string; // not from Figma
  filters: { hashtag: string; department: string; hashtagList: string; departmentList: string };
  carousel: HighlightCarouselCopy;
  card: KudoHighlightCardCopy;
};

const TITLE_ID = "highlight-kudos-title";

/*
 * Figma B (2940:13451): header with the Hashtag / Phòng ban filters, the card carousel and the page control.
 * The carousel is keyed by the active filters, so changing a filter remounts it on slide 1/n.
 */
export function HighlightKudosSection({
  kudos,
  hashtags,
  departments,
  filters,
  locale,
  copy,
}: {
  /** `null` when the block failed to load (`getKudosBoardData` isolates failures per block). */
  kudos: readonly KudoRow[] | null;
  hashtags: readonly Hashtag[];
  departments: readonly Department[];
  filters: KudosFilters;
  locale: Locale;
  copy: HighlightKudosCopy;
}) {
  const carouselKey = `${filters.hashtag ?? ""}|${filters.department ?? ""}`;
  return (
    // mm:2940:13451
    <section data-testid="highlight-kudos" aria-labelledby={TITLE_ID} className="flex w-full flex-col gap-10 font-montserrat">
      {/* mm:2940:13452 */}
      <div className="mx-auto w-full max-w-[1512px] px-4 md:px-12 xl:px-36">
        <KudosSectionHeader eyebrow={copy.eyebrow} title={copy.title} titleId={TITLE_ID}>
          {/* mm:2940:13458 */}
          <div className="flex items-center gap-2">
            <KudosFilterDropdown
              param="hashtag"
              label={copy.filters.hashtag}
              listLabel={copy.filters.hashtagList}
              options={hashtags.map((tag) => ({ value: tag.slug, label: locale === "en" ? tag.name_en : tag.name_vi }))}
              optionPrefix="#"
              filters={filters}
            />
            <KudosFilterDropdown
              param="department"
              label={copy.filters.department}
              listLabel={copy.filters.departmentList}
              options={departments.map((department) => ({ value: department.code, label: department.code }))}
              filters={filters}
            />
          </div>
        </KudosSectionHeader>
      </div>
      {kudos === null || kudos.length === 0 ? (
        <p className="px-4 py-16 text-center text-xl leading-8 font-bold text-white">
          {kudos === null ? copy.error : copy.empty}
        </p>
      ) : (
        <HighlightCarousel key={carouselKey} copy={copy.carousel}>
          {kudos.map((kudo) => (
            <KudoHighlightCard key={kudo.id} kudo={kudo} filters={filters} locale={locale} copy={copy.card} />
          ))}
        </HighlightCarousel>
      )}
    </section>
  );
}
