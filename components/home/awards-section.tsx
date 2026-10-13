import { AwardCard } from "./award-card";
import { AWARD_CARDS } from "./award-cards-data";

/* 2 columns below xl (Figma + test ID-16), 3 columns of 336px from xl. */
export function AwardsSection() {
  return (
    // mm:2167:9068
    <section
      data-testid="awards-section"
      className="relative mx-auto mt-20 flex w-full max-w-[1512px] flex-col gap-10 px-4 font-montserrat md:px-12 lg:mt-[100px] lg:gap-20 xl:px-36"
    >
      {/* mm:2167:9069 */}
      <div className="flex flex-col gap-4">
        {/* mm:2167:9070 */}
        <p className="text-xl leading-8 font-bold text-white md:text-2xl">Sun* annual awards 2025</p>
        {/* mm:2167:9071 */}
        <div className="h-px w-full bg-login-divider" />
        {/* mm:2167:9072 */}
        {/* mm:2167:9073 */}
        <h2 className="text-4xl leading-[1.15] font-bold tracking-[-0.25px] text-login-accent md:text-[57px] md:leading-16">
          Hệ thống giải thưởng
        </h2>
      </div>
      {/* mm:5005:14974 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12 xl:grid-cols-[repeat(3,minmax(0,336px))] xl:justify-between xl:gap-y-20">
        {AWARD_CARDS.map((award) => (
          <AwardCard key={award.slug} award={award} />
        ))}
      </div>
    </section>
  );
}
