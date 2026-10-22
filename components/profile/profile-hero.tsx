import Image from "next/image";
import { HeroTitle, Stars, type KudoPersonCopy } from "@/components/kudos/kudo-person";
import { heroTier, starCount } from "@/lib/kudos/hero-title";
import type { KudoPerson } from "@/lib/kudos/kudo-types";

/*
 * Hero block of both Profile frames (Figma `mms_A_Info` 362:5052): 200px avatar with a 4px white ring (362:5053), the full name
 * in gold 36/44 (362:5055), then the detail row (362:5056): department 22/28 white, a 4px dot at 40% opacity (362:5060), the
 * Hero badge (109x19, 3053:6061) and the stars. A missing department drops its text and the dot; no Hero title (no Kudos)
 * and under 10 Kudos drop the badge and the stars. The avatar is a Google or demo image, so it skips the optimiser like the card's.
 * Tooltips are the board's: the badge's is centred under it from md and on the info column below md (so it stays inside a phone,
 * Figma 16px margins), the stars' is right-aligned to them. The info column is `relative` for that.
 */
export function ProfileHero({ person, name, copy }: { person: KudoPerson; name: string; copy: KudoPersonCopy }) {
  const tier = heroTier(person.distinct_senders);
  const stars = starCount(person.kudos_received);
  const { department, avatar_url: avatar } = person;
  return (
    // mm:362:5052
    <section data-testid="profile-hero" className="flex w-full flex-col items-center gap-8">
      {/* mm:362:5053 */}
      <span
        data-testid="profile-avatar"
        className="relative block size-40 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#eee] md:size-[200px]"
      >
        {avatar && <Image src={avatar} alt="" fill unoptimized sizes="(min-width: 768px) 200px, 160px" className="object-cover" />}
      </span>
      {/* mm:362:5054 */}
      <div className="relative flex w-full flex-col items-center gap-2">
        {/* mm:362:5055 */}
        <h1 className="text-center text-2xl leading-8 font-bold break-words text-login-accent md:text-4xl md:leading-11">{name}</h1>
        {/* mm:362:5056 */}
        {(department || tier !== "none" || stars !== 0) && (
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
            {department && <span className="text-lg leading-7 font-bold text-white md:text-[22px]">{department}</span>}
            {department && tier !== "none" && <span aria-hidden className="size-1 rounded-full bg-kudos-muted opacity-40" />}
            {tier !== "none" && (
              <span data-testid="profile-hero-badge" className="inline-flex">
                <HeroTitle tier={tier} tip={copy.heroTips[tier]} align="page" />
              </span>
            )}
            {stars !== 0 && (
              <span data-testid="profile-hero-stars" className="inline-flex">
                <Stars count={stars} tip={copy.starTips[stars - 1]} align="end" />
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
