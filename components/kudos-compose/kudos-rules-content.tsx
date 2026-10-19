import Image from "next/image";
import { HeroBadge } from "@/components/kudos/kudo-person";

type HeroRow = { label: string; range: string; description: string };
type Six<T> = readonly [T, T, T, T, T, T];

/** Every string of the Thể lệ panel (Figma b1Filzi9i6). Hero rows are ordered New, Rising, Super, Legend; badges follow BADGES. */
export type KudosRulesCopy = {
  title: string;
  receiverHeading: string;
  receiverIntro: string;
  heroes: readonly [HeroRow, HeroRow, HeroRow, HeroRow];
  senderHeading: string;
  senderIntro: string;
  badgeNames: Six<string>;
  giftNote: string;
  nationalHeading: string;
  nationalBody: string;
};

/* Order of the 3 + 3 grid (Figma Frame 511 / 513). `compact` = the 11px labels (long names); the others are 12px. */
const BADGES = [
  { slug: "revival", compact: false },
  { slug: "touch-of-light", compact: true },
  { slug: "stay-gold", compact: false },
  { slug: "flow-to-horizon", compact: true },
  { slug: "beyond-the-boundary", compact: true },
  { slug: "root-further", compact: true },
] as const;

const HERO_TIERS = ["new", "rising", "super", "legend"] as const;

const HEADING = "text-[22px] leading-7 font-bold text-login-accent";
const BODY = "text-justify text-base leading-6 font-bold tracking-[0.5px] text-white";

/* Rules copy of the right-hand panel; the dialog shell, scroll area and footer buttons live in KudosRulesDialog. */
export function KudosRulesContent({ copy }: { copy: KudosRulesCopy }) {
  return (
    // mm:3204:6053
    <div className="flex w-full max-w-[473px] flex-col gap-6">
      {/* mm:3204:6055 */}
      {/* id is the aria-labelledby target of KudosRulesDialog (a client module, so the literal is repeated there) */}
      <h2 id="kudos-rules-title" className="text-4xl leading-[44px] font-bold text-login-accent sm:text-[45px] sm:leading-[52px]">
        {copy.title}
      </h2>
      {/* mm:3204:6076 */}
      <div className="flex flex-col gap-4">
        {/* mm:3204:6131 */}
        <section className="flex flex-col gap-4">
          {/* mm:3204:6132 */}
          <h3 className={HEADING}>{copy.receiverHeading}</h3>
          {/* mm:3204:6133 */}
          <p className={BODY}>{copy.receiverIntro}</p>
          <ul className="flex flex-col gap-4 pl-5">
            {copy.heroes.map((hero, index) => (
              // mm:3204:6161 / 3204:6170 / 3204:6179 / 3204:6188
              <li key={HERO_TIERS[index]} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {/* mm:3204:6163 / 6172 / 6181 / 6190 */}
                  <HeroBadge tier={HERO_TIERS[index]} label={hero.label} size="medium" />
                  {/* mm:3204:6162 / 6171 / 6180 / 6189 */}
                  <span className="text-base leading-6 font-bold tracking-[0.5px] text-white">{hero.range}</span>
                </div>
                {/* mm:3204:6168 / 6173 / 6182 / 6191 */}
                <p className="text-justify text-sm leading-5 font-bold tracking-[0.1px] text-white">{hero.description}</p>
              </li>
            ))}
          </ul>
        </section>
        {/* mm:3204:6077 */}
        <h3 className={HEADING}>{copy.senderHeading}</h3>
        {/* mm:3204:6078 */}
        <p className={BODY}>{copy.senderIntro}</p>
        {/* mm:3204:6079 */}
        <ul className="mx-auto grid w-full max-w-[377px] grid-cols-3 justify-items-center gap-x-4 gap-y-4">
          {BADGES.map((badge, index) => (
            // mm:3204:6082 / 6087 / 6086 / 6083 / 6084 / 6088
            <li key={badge.slug} data-testid="rules-badge" className="flex w-20 flex-col items-center gap-2">
              <Image
                src={`/images/kudos/rules/badge-${badge.slug}.png`}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="size-16 rounded-full"
              />
              <span className={`w-20 text-center font-bold tracking-[0.5px] text-white ${badge.compact ? "text-[11px]" : "text-xs"} leading-4`}>
                {copy.badgeNames[index]}
              </span>
            </li>
          ))}
        </ul>
        {/* mm:3204:6089 */}
        <p className={BODY}>{copy.giftNote}</p>
        {/* mm:3204:6090 */}
        <h3 className="text-2xl leading-8 font-bold text-login-accent">{copy.nationalHeading}</h3>
        {/* mm:3204:6091 */}
        <p className={BODY}>{copy.nationalBody}</p>
      </div>
    </div>
  );
}
