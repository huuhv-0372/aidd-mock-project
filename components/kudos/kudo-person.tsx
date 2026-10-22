import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { heroTier, starCount, type HeroTier } from "@/lib/kudos/hero-title";
import type { KudoPerson as KudoPersonData } from "@/lib/kudos/kudo-types";
import { profileHref } from "@/lib/navigation/routes";
import { KUDO_CARD_FOCUS_RING } from "./kudo-card-focus-ring";

type Tier = Exclude<HeroTier, "none">;
type Tip = { label: string; headline: string; body: string };

export type KudoPersonCopy = {
  anonymous: string;
  /** Hero title tooltips (frames twC9br89ra / IjeDnHmzou / d6zEZ9ccoX / XI0QKVv1qZ). */
  heroTips: Record<Tier, Tip>;
  /** Star tooltips for 1, 2 and 3 stars (spec B.3.2). */
  starTips: readonly [string, string, string];
};

const BADGE_IMAGE: Record<Exclude<Tier, "new">, string> = {
  rising: "/images/kudos/hero-rising.png",
  super: "/images/kudos/hero-super.png",
  legend: "/images/kudos/hero-legend.png",
};

const TOOLTIP =
  "pointer-events-none invisible absolute top-full z-50 mt-2 flex w-[min(304px,calc(100vw_-_4rem))] flex-col gap-[11px] rounded-2xl bg-kudos-panel p-4 text-left opacity-0 group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:opacity-100 motion-safe:transition-opacity motion-safe:duration-150";

/* Hero pill sizes: card (Figma 109x19), Thể lệ panel (126x22) and the tooltip header (156x36). */
const BADGE_SIZE = {
  small: { box: "h-[19px] w-[109px] text-[11px]", width: 109, height: 19, sizes: "109px" },
  medium: { box: "h-[22px] w-[126px] shrink-0 text-[13px] leading-[19px]", width: 126, height: 22, sizes: "126px" },
  large: { box: "h-9 w-[156px] text-base", width: 109, height: 19, sizes: "156px" },
} as const;

/* Hero pill. The "new" tier has no exported artwork in MoMorph, so it is drawn in CSS. */
export function HeroBadge({ tier, label, size = "small" }: { tier: Tier; label: string; size?: keyof typeof BADGE_SIZE }) {
  const { box, width, height, sizes } = BADGE_SIZE[size];
  if (tier !== "new") {
    return <Image src={BADGE_IMAGE[tier]} alt={label} width={width} height={height} sizes={sizes} className={`${box} object-contain`} />;
  }
  return (
    <span
      className={`${box} inline-flex items-center justify-center rounded-full border-[0.5px] border-login-accent bg-[#092432] font-bold text-white [text-shadow:0_0.4px_1.5px_#000]`}
    >
      {label}
    </span>
  );
}

function HeroTitle({ tier, tip, align }: { tier: Tier; tip: Tip; align: "start" | "end" }) {
  const tipId = useId();
  return (
    <span className="group/tip relative inline-flex">
      <span tabIndex={0} aria-describedby={tipId} className={`inline-flex rounded-full ${KUDO_CARD_FOCUS_RING}`}>
        <HeroBadge tier={tier} label={tip.label} />
      </span>
      <span role="tooltip" id={tipId} className={`${TOOLTIP} ${align === "end" ? "right-0" : "left-0"}`}>
        <HeroBadge tier={tier} label={tip.label} size="large" />
        <span className="text-sm leading-5 font-bold tracking-[0.1px] text-white">{tip.headline}</span>
        <span className="text-sm leading-5 font-bold tracking-[0.1px] text-kudos-muted">{tip.body}</span>
      </span>
    </span>
  );
}

function Stars({ count, tip, align }: { count: 1 | 2 | 3; tip: string; align: "start" | "end" }) {
  const tipId = useId();
  return (
    <span className="group/tip relative inline-flex">
      <span tabIndex={0} aria-describedby={tipId} className={`inline-flex gap-0.5 rounded ${KUDO_CARD_FOCUS_RING}`}>
        {Array.from({ length: count }, (_, i) => (
          <svg key={i} width="14" height="14" viewBox="0 0 24 24" aria-hidden className="text-login-accent">
            <path fill="currentColor" d="m12 2 2.9 6.9 7.5.6-5.7 4.9 1.7 7.3L12 17.8 5.6 21.7l1.7-7.3L1.6 9.5l7.5-.6z" />
          </svg>
        ))}
      </span>
      <span role="tooltip" id={tipId} className={`${TOOLTIP} ${align === "end" ? "right-0" : "left-0"}`}>
        <span className="text-sm leading-5 font-bold tracking-[0.1px] text-white">{tip}</span>
      </span>
    </span>
  );
}

/*
 * One side of the Kudo card header (Figma `Infor`, 235px column): 64px avatar, name, department, Hero title and stars.
 * Anonymous Kudo: `person` is null, the alias (or the generic label) is shown and nothing links anywhere.
 * `role` becomes the test id `kudo-sender` / `kudo-recipient` on the name. Avatars are 64px Google or demo images,
 * so they skip the image optimiser (`unoptimized`). From `sm` the column is 235px (Figma) and hugs its side of the card: it bleeds into the grid gap by up to 35px so
 * the two columns never overlap, a long name fits one line and truncates; on mobile the name wraps instead.
 */
export function KudoPersonInfo({
  person,
  anonymousName,
  role,
  align,
  copy,
}: {
  person: KudoPersonData | null;
  anonymousName?: string | null;
  role: "sender" | "recipient";
  align: "start" | "end";
  copy: KudoPersonCopy;
}) {
  const testId = `kudo-${role}`;
  const tier = person ? heroTier(person.distinct_senders) : "none";
  const stars = person ? starCount(person.kudos_received) : 0;
  const name = person ? (person.full_name ?? "") : (anonymousName || copy.anonymous);
  const avatar = person?.avatar_url;
  const avatarEl = (
    <span className="block size-16 overflow-hidden rounded-full border-[1.869px] border-white bg-[#eee]">
      {avatar && <Image src={avatar} alt="" width={64} height={64} unoptimized className="size-full object-cover" />}
    </span>
  );
  return (
    // mm:I2940:13465;335:9443
    <div
      className={`flex min-w-0 flex-col items-center gap-[13px] sm:w-[min(235px,calc(100%_+_35px))] ${align === "start" ? "sm:justify-self-start" : "sm:justify-self-end"}`}
    >
      {/* mm:I2940:13465;335:9443;256:4734 */}
      {person ? (
        <Link href={profileHref(person.id)} tabIndex={-1} aria-hidden className="rounded-full">
          {avatarEl}
        </Link>
      ) : (
        avatarEl
      )}
      {/* mm:I2940:13465;335:9443;256:4737 */}
      <div className="flex min-w-0 max-w-full flex-col items-center gap-0.5">
        {/* mm:I2940:13465;335:9443;256:4735 */}
        {person ? (
          <Link
            href={profileHref(person.id)}
            data-testid={testId}
            className={`-my-2.5 inline-flex max-w-full items-center py-2.5 rounded text-center text-base leading-6 font-bold tracking-[0.15px] break-words text-login-bg hover:underline ${KUDO_CARD_FOCUS_RING}`}
          >
            <span className="min-w-0 sm:truncate">{name}</span>
          </Link>
        ) : (
          <span data-testid={testId} className="max-w-full text-center text-base leading-6 font-bold tracking-[0.15px] text-login-bg sm:truncate">
            {name}
          </span>
        )}
        {/* mm:I2940:13465;335:9443;256:4741 */}
        {person && (
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
            <span className="text-sm leading-5 font-bold tracking-[0.1px] text-kudos-muted">{person.department ?? ""}</span>
            {tier !== "none" && (
              <>
                <span aria-hidden className="size-1 rounded-full bg-kudos-muted opacity-40" />
                <HeroTitle tier={tier} tip={copy.heroTips[tier]} align={align} />
              </>
            )}
            {stars !== 0 && <Stars count={stars} tip={copy.starTips[stars - 1]} align={align} />}
          </div>
        )}
      </div>
    </div>
  );
}
