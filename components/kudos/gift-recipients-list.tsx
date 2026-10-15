import Image from "next/image";
import Link from "next/link";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import type { Locale } from "@/lib/i18n/locales";
import type { GiftRecipient } from "@/lib/kudos/kudo-types";
import { profileHref } from "@/lib/navigation/routes";
import { KudosEmptyState } from "./kudos-empty-state";

export type GiftRecipientsCopy = {
  /** Panel title; the "\n" is the Figma line break (D.3.1). */
  title: string;
  empty: string;
  /** "Nhận được" / "Received": goes in front of the gift name (reports/en-localizations.md). */
  receivedPrefix: string;
  /** Names the independently scrolling list for assistive tech. */
  listLabel: string; // not from Figma
  /** Generic text shown when the block failed to load. */
  error: string; // not from Figma
};

/*
 * "10 SUNNER NHẬN QUÀ MỚI NHẤT" (Figma D.3 `2940:13510`, 422px): title and a list of recipients, newest award first.
 * The list scrolls on its own (Figma shows 5 rows in 384px with a 2px grey scrollbar); the panel does not grow.
 * Avatar and name link to the profile; the description is the localized gift name.
 */
export function GiftRecipientsList({
  gifts,
  locale,
  copy,
}: {
  gifts: readonly GiftRecipient[] | null;
  locale: Locale;
  copy: GiftRecipientsCopy;
}) {
  return (
    // mm:2940:13510
    <section
      data-testid="gift-recipients"
      aria-labelledby="gift-recipients-title"
      className="box-border flex w-full flex-col gap-4 rounded-[17px] border border-home-border bg-kudos-panel py-6 pr-4 pl-6 font-montserrat"
    >
      {/* mm:2940:13513 */}
      <h3
        id="gift-recipients-title"
        className="text-center text-lg leading-7 font-bold whitespace-pre-line text-login-accent md:text-[22px]"
      >
        {copy.title}
      </h3>
      {gifts === null ? (
        <KudosEmptyState message={copy.error} className="py-4" />
      ) : gifts.length === 0 ? (
        <KudosEmptyState message={copy.empty} className="py-4" />
      ) : (
        // mm:2940:13514
        <ul
          tabIndex={0}
          aria-label={copy.listLabel}
          className={`flex max-h-96 flex-col gap-4 overflow-y-auto pr-2 [scrollbar-color:#999_transparent] [scrollbar-width:thin] ${FOCUS_RING}`}
        >
          {gifts.map(({ recipient, gift_name_vi, gift_name_en, awarded_at }) => (
            // mm:2940:13516
            <li key={`${recipient.id}-${awarded_at}`} data-testid="gift-recipient" className="flex items-center gap-2">
              {/* mm:I2940:13516;256:7460 */}
              <Link href={profileHref(recipient.id)} tabIndex={-1} aria-hidden className="shrink-0 rounded-full">
                <span className="block size-16 overflow-hidden rounded-full border-[1.869px] border-white bg-[#eee]">
                  {recipient.avatar_url && (
                    <Image src={recipient.avatar_url} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
                  )}
                </span>
              </Link>
              {/* mm:I2940:13516;256:7461 */}
              <div className="flex min-w-0 flex-col gap-0.5">
                {/* mm:I2940:13516;256:7462 */}
                <Link
                  href={profileHref(recipient.id)}
                  className={`-my-2 inline-flex min-h-11 items-center rounded text-lg leading-7 font-bold break-words text-login-accent hover:underline md:text-[22px] ${FOCUS_RING}`}
                >
                  {recipient.full_name}
                </Link>
                {/* mm:I2940:13516;256:7472 */}
                <p className="text-base leading-6 font-bold tracking-[0.15px] text-white">
                  {copy.receivedPrefix} {locale === "en" ? gift_name_en : gift_name_vi}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
