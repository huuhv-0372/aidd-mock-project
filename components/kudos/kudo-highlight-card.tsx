import Link from "next/link";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { IconArrowUpRight } from "@/components/site-shell/shell-icons";
import type { Locale } from "@/lib/i18n/locales";
import { formatKudoTime } from "@/lib/kudos/format-kudo-time";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { kudoPlainText } from "@/lib/kudos/kudo-plain-text";
import { kudoDetailHref } from "@/lib/navigation/routes";
import type { KudosFilters } from "@/lib/validation/kudos";
import { CopyKudoLinkButton, type CopyKudoLinkCopy } from "./copy-kudo-link-button";
import { KudoHashtagList } from "./kudo-hashtag-list";
import { KudoHearts, type KudoHeartsCopy } from "./kudo-hearts";
import { KudoPersonInfo, type KudoPersonCopy } from "./kudo-person";

export type KudoHighlightCardCopy = {
  person: KudoPersonCopy;
  hearts: KudoHeartsCopy;
  copyLink: CopyKudoLinkCopy;
  viewDetails: string;
};

const DIVIDER = "h-px w-full bg-login-accent";

/*
 * Highlight card (Figma component 335:9620, 528px): sender to recipient, time, danh hieu, content clamped to
 * 3 lines, hashtags on one line, hearts + Copy Link + View details. A server component: only the copy button is client.
 */
export function KudoHighlightCard({
  kudo,
  filters,
  locale,
  copy,
}: {
  kudo: KudoRow;
  filters: KudosFilters;
  locale: Locale;
  copy: KudoHighlightCardCopy;
}) {
  const sender = kudo.is_anonymous ? null : kudo.sender;
  return (
    // mm:2940:13465
    <article
      data-testid="kudo-card"
      data-kudo-id={kudo.id}
      className="box-border flex w-full flex-col gap-4 rounded-2xl border-4 border-login-accent bg-kudos-card px-6 pt-6 pb-4 font-montserrat"
    >
      {/* mm:I2940:13465;335:9442 */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
        <KudoPersonInfo person={sender} anonymousName={kudo.anonymous_name} role="sender" align="start" copy={copy.person} />
        {/* mm:I2940:13465;335:9444 */}
        <span aria-hidden className="kudos-icon kudos-icon-send mt-4 size-8 text-login-bg" />
        <KudoPersonInfo person={kudo.recipient} role="recipient" align="end" copy={copy.person} />
      </div>
      {/* mm:I2940:13465;335:9447 */}
      <div className={DIVIDER} />
      {/* mm:I2940:13465;335:9448 */}
      <div className="flex flex-col gap-4">
        {/* mm:I2940:13465;335:9449 */}
        <time
          data-testid="kudo-time"
          dateTime={kudo.created_at}
          className="text-base leading-6 font-bold tracking-[0.5px] text-kudos-muted"
        >
          {formatKudoTime(kudo.created_at)}
        </time>
        {/* mm:I2940:13465;1810:19718 */}
        <p data-testid="kudo-title" className="text-center text-base leading-6 font-bold tracking-[0.5px] text-login-bg">
          {kudo.title}
        </p>
        {/* mm:I2940:13465;662:12221 */}
        <div className="min-h-[120px] rounded-xl border border-login-accent bg-[rgb(255_234_158/0.4)] px-6 py-4">
          {/* mm:I2940:13465;662:12223 */}
          <p
            data-testid="kudo-content"
            className="line-clamp-3 text-justify text-xl leading-8 font-bold whitespace-pre-line text-login-bg [overflow-wrap:anywhere]"
          >
            {kudoPlainText(kudo.content)}
          </p>
        </div>
        <KudoHashtagList tags={kudo.hashtags} filters={filters} locale={locale} />
      </div>
      {/* mm:I2940:13465;335:9460 */}
      <div className={DIVIDER} />
      {/* mm:I2940:13465;335:9461 */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <KudoHearts count={kudo.heart_count} liked={kudo.liked_by_me} own={kudo.is_mine} locale={locale} copy={copy.hearts} />
        {/* mm:I2940:13465;335:9672 */}
        <div className="flex flex-wrap items-center gap-2">
          <CopyKudoLinkButton kudoId={kudo.id} copy={copy.copyLink} />
          {/* mm:I2940:13465;335:9663 */}
          <Link
            href={kudoDetailHref(kudo.id)}
            className={`inline-flex min-h-14 min-w-11 items-center gap-1 rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg hover:bg-black/5 motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
          >
            {copy.viewDetails}
            <IconArrowUpRight />
          </Link>
        </div>
      </div>
    </article>
  );
}
