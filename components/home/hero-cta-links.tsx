import Link from "next/link";
import { AWARDS_INFORMATION_PATH, SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import { FOCUS_RING, PRIMARY_CTA_HOVER } from "@/components/site-shell/shell-class-names";
import { IconArrowUpRight } from "@/components/site-shell/shell-icons";

const CTA_BASE = `flex min-h-14 items-center gap-2 rounded-lg text-lg leading-7 font-bold md:text-[22px] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 ${FOCUS_RING}`;

/* Figma strokes are inside the 60px box: the bordered button trims 1px of padding per side. */
const PAD = "px-5 py-4 md:px-6";
const PAD_BORDERED = "px-[19px] py-[15px] md:px-[23px]";

export function HeroCtaLinks() {
  return (
    // mm:2167:9062
    <div className="flex flex-wrap items-start gap-4 md:gap-10">
      {/* mm:2167:9063 */}
      <Link
        href={AWARDS_INFORMATION_PATH}
        className={`${CTA_BASE} ${PAD} bg-login-accent text-login-bg ${PRIMARY_CTA_HOVER}`}
      >
        {/* mm:I2167:9063;186:1568 */}
        ABOUT AWARDS
        {/* mm:I2167:9063;186:1766 */}
        <IconArrowUpRight />
      </Link>
      {/* mm:2167:9064 */}
      <Link
        href={SUN_KUDOS_PATH}
        className={`${CTA_BASE} ${PAD_BORDERED} border border-home-border bg-[rgb(255_234_158/0.1)] text-white hover:bg-[rgb(255_234_158/0.2)]`}
      >
        {/* mm:I2167:9064;186:2760 */}
        ABOUT KUDOS
        {/* mm:I2167:9064;186:2761 */}
        <IconArrowUpRight />
      </Link>
    </div>
  );
}
