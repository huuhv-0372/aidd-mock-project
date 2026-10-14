import { AwardContent } from "./award-content";
import type { AwardSectionData } from "./award-sections-data";
import { AwardTile } from "./award-tile";

/*
 * One award card (Figma D.1-D.6). `scroll-mt-*` clears the sticky bars (chip bar below lg, header from lg)
 * and is the SAME on all six cards: useActiveAward reads it from the first card as its scroll-spy line.
 * `reverse` puts the picture on the right from lg (D.2, D.4, D.6); below lg the picture is always on top.
 */
export function AwardSection({
  award,
  reverse,
  showDivider,
}: {
  award: AwardSectionData;
  reverse: boolean;
  showDivider: boolean;
}) {
  return (
    // mm:313:8467
    <section
      id={award.slug}
      data-testid="award-section"
      aria-labelledby={`${award.slug}-title`}
      className="flex scroll-mt-20 flex-col gap-10 lg:scroll-mt-28 lg:gap-20"
    >
      <div className={`flex flex-col gap-6 lg:gap-10 ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
        <AwardTile slug={award.slug} title={award.title} />
        <AwardContent award={award} />
      </div>
      {showDivider ? <div aria-hidden="true" className="h-px w-full bg-login-divider" /> : null}
    </section>
  );
}
