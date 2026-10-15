import type { Locale } from "@/lib/i18n/locales";
import { formatKudoTime } from "@/lib/kudos/format-kudo-time";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { kudoPlainText } from "@/lib/kudos/kudo-plain-text";
import type { KudosFilters } from "@/lib/validation/kudos";
import { CopyKudoLinkButton, type CopyKudoLinkCopy } from "./copy-kudo-link-button";
import { KudoHashtagList } from "./kudo-hashtag-list";
import { KudoHearts, type KudoHeartsCopy } from "./kudo-hearts";
import { KudoImageGallery, type KudoImageGalleryCopy } from "./kudo-image-gallery";
import { KudoPersonInfo, type KudoPersonCopy } from "./kudo-person";

export type KudoPostCardCopy = {
  person: KudoPersonCopy;
  hearts: KudoHeartsCopy;
  copyLink: CopyKudoLinkCopy;
  gallery: KudoImageGalleryCopy;
};

const DIVIDER = "h-px w-full bg-login-accent";

/*
 * Feed card (Figma component `Qhg3SUg_8L`, instance 3127:21871, 680px): sender to recipient, divider, time,
 * danh hieu, content clamped to 5 lines, up to 5 images, hashtags, divider, hearts + Copy Link.
 * Unlike the Highlight card there is no "Xem chi tiet" link (Figma C.4 has only the heart and Copy Link).
 */
export function KudoPostCard({
  kudo,
  filters,
  locale,
  copy,
}: {
  kudo: KudoRow;
  filters: KudosFilters;
  locale: Locale;
  copy: KudoPostCardCopy;
}) {
  const sender = kudo.is_anonymous ? null : kudo.sender;
  return (
    // mm:3127:21871
    <article
      data-testid="kudo-card"
      data-kudo-id={kudo.id}
      className="box-border flex w-full flex-col gap-4 rounded-3xl bg-kudos-card px-4 pt-6 pb-4 font-montserrat md:px-10 md:pt-10"
    >
      {/* mm:I3127:21871;256:4857 */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
        <KudoPersonInfo person={sender} anonymousName={kudo.anonymous_name} role="sender" align="start" copy={copy.person} />
        {/* mm:I3127:21871;256:5147 */}
        <span aria-hidden className="kudos-icon kudos-icon-send mt-4 size-8 text-login-bg" />
        <KudoPersonInfo person={kudo.recipient} role="recipient" align="end" copy={copy.person} />
      </div>
      {/* mm:I3127:21871;256:5192 */}
      <div className={DIVIDER} />
      {/* mm:I3127:21871;256:5645 */}
      <div className="flex flex-col gap-4">
        {/* mm:I3127:21871;256:5229 */}
        <time
          data-testid="kudo-time"
          dateTime={kudo.created_at}
          className="text-base leading-6 font-bold tracking-[0.5px] text-kudos-muted"
        >
          {formatKudoTime(kudo.created_at)}
        </time>
        {/* mm:I3127:21871;2234:33038 */}
        <div className="flex items-center gap-2">
          {/* mm:I3127:21871;2234:33039 */}
          <p data-testid="kudo-title" className="min-w-0 flex-1 text-center text-base leading-6 font-bold tracking-[0.5px] text-login-bg">
            {kudo.title}
          </p>
          {/* mm:I3127:21871;2234:33040 */}
          <span aria-hidden className="kudos-icon kudos-icon-pen size-8 text-login-bg" />
        </div>
        {/* mm:I3127:21871;662:11382 */}
        <div className="rounded-xl border border-login-accent bg-[rgb(255_234_158/0.4)] px-6 py-4">
          {/* mm:I3127:21871;256:5156 */}
          <p
            data-testid="kudo-content"
            className="line-clamp-5 text-justify text-xl leading-8 font-bold whitespace-pre-line text-login-bg [overflow-wrap:anywhere]"
          >
            {kudoPlainText(kudo.content)}
          </p>
        </div>
        <KudoImageGallery images={kudo.images} copy={copy.gallery} />
        <KudoHashtagList tags={kudo.hashtags} filters={filters} locale={locale} />
      </div>
      {/* mm:I3127:21871;256:7496 */}
      <div className={DIVIDER} />
      {/* mm:I3127:21871;256:5194 */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <KudoHearts count={kudo.heart_count} liked={kudo.liked_by_me} own={kudo.is_mine} locale={locale} copy={copy.hearts} />
        <CopyKudoLinkButton kudoId={kudo.id} copy={copy.copyLink} />
      </div>
    </article>
  );
}
