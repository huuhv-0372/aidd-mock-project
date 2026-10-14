import type { Dictionary } from "@/messages/vi";
import { AwardSection } from "./award-section";
import { getAwardNavItems, getAwardSections } from "./award-sections-data";
import { AwardsNav } from "./awards-nav";

/*
 * Figma B: category menu (C) + award list (D). 1152px column at 1440 (xl:px-36), nav 178px left,
 * cards 856px right. Below lg the menu is a sticky chip bar above the stacked cards.
 */
export function AwardsLayout({ copy }: { copy: Dictionary["awards"] }) {
  const sections = getAwardSections(copy);
  return (
    // mm:313:8458
    <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-8 px-4 pt-12 font-montserrat md:px-12 lg:flex-row lg:justify-between lg:gap-8 lg:pt-19 xl:gap-20 xl:px-36">
      <AwardsNav items={getAwardNavItems(sections)} ariaLabel={copy.navAriaLabel} />
      {/* mm:313:8466 */}
      <div className="flex min-w-0 flex-1 flex-col gap-10 lg:max-w-[856px] lg:gap-20">
        {sections.map((award, index) => (
          <AwardSection
            key={award.slug}
            award={award}
            copy={copy}
            reverse={index % 2 === 1}
            showDivider={index < sections.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
