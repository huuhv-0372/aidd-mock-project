import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { formatKudoTime } from "@/lib/kudos/format-kudo-time";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { CopyKudoLinkButton } from "./copy-kudo-link-button";
import { KudoDetailCloseButton } from "./kudo-detail-close-button";
import { KudoHashtagList } from "./kudo-hashtag-list";
import { KudoHearts } from "./kudo-hearts";
import { KudoImageGallery } from "./kudo-image-gallery";
import { KudoPersonInfo } from "./kudo-person";
import type { KudoPostCardCopy } from "./kudo-post-card";

export type KudoDetailCardCopy = KudoPostCardCopy & { close: string };

const DIVIDER = "h-px w-full bg-login-accent";
/* Block spacing and marks of the rich content (paragraphs, ordered list, quote, links); strong / em / s keep the browser defaults. */
const RICH_CONTENT =
  "[&>*+*]:mt-2 [&_p]:whitespace-pre-line [&_ol]:list-decimal [&_ol]:pl-8 [&_blockquote]:border-l-4 [&_blockquote]:border-login-bg/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:rounded [&_a]:underline [&_a]:underline-offset-2 [&_a]:outline-offset-2 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-login-bg";

/*
 * View Kudo frame (Figma 520:18779, 680px): the feed card laid out in full, so nothing between `content` and the frame clips or
 * clamps. From the top: divider, sender to recipient, time, danh hieu, content box (rich content passed in by the page),
 * up to 5 images, hashtags, divider, hearts + Copy Link + Dong. The board filters do not apply here, hence `{}` for the hashtag links.
 */
export function KudoDetailCard({
  kudo,
  locale,
  copy,
  content,
}: {
  kudo: KudoRow;
  locale: Locale;
  copy: KudoDetailCardCopy;
  content: ReactNode;
}) {
  const sender = kudo.is_anonymous ? null : kudo.sender;
  return (
    // mm:520:18779
    <article
      data-testid="kudo-detail"
      data-kudo-id={kudo.id}
      className="box-border flex w-full flex-col gap-4 rounded-3xl bg-kudos-card px-4 pt-6 pb-6 font-montserrat md:px-10 md:pt-10"
    >
      <div className={DIVIDER} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-6">
        <KudoPersonInfo person={sender} anonymousName={kudo.anonymous_name} role="sender" align="start" copy={copy.person} />
        <span aria-hidden className="kudos-icon kudos-icon-send mt-4 size-8 text-login-bg" />
        <KudoPersonInfo person={kudo.recipient} role="recipient" align="end" copy={copy.person} />
      </div>
      <time
        data-testid="kudo-time"
        dateTime={kudo.created_at}
        className="text-base leading-6 font-bold tracking-[0.5px] text-kudos-muted"
      >
        {formatKudoTime(kudo.created_at)}
      </time>
      <p data-testid="kudo-title" className="text-center text-base leading-6 font-bold tracking-[0.5px] text-login-bg">
        {kudo.title}
      </p>
      <div className="rounded-xl border border-login-accent bg-[rgb(255_234_158/0.4)] px-6 py-[15px]">
        <div
          data-testid="kudo-content"
          className={`text-justify text-xl leading-8 font-bold text-login-bg [overflow-wrap:anywhere] ${RICH_CONTENT}`}
        >
          {content}
        </div>
      </div>
      <KudoImageGallery images={kudo.images} copy={copy.gallery} plain />
      <KudoHashtagList tags={kudo.hashtags} filters={{}} locale={locale} wrap />
      <div className={DIVIDER} />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <KudoHearts kudoId={kudo.id} count={kudo.heart_count} liked={kudo.liked_by_me} own={kudo.is_mine} locale={locale} copy={copy.hearts} />
        <div className="flex flex-wrap items-center gap-2">
          <CopyKudoLinkButton kudoId={kudo.id} copy={copy.copyLink} />
          <KudoDetailCloseButton label={copy.close} />
        </div>
      </div>
    </article>
  );
}
