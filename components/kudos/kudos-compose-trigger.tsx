import Image from "next/image";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";

export type KudosComposeCopy = { placeholder: string; searchPlaceholder: string };

const PILL =
  "flex min-h-14 w-full items-center gap-4 rounded-[68px] border border-home-border bg-[rgb(255_234_158/0.1)] px-4 py-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white md:min-h-[72px] md:py-[23px]";

/*
 * Figma "Button chuc nang" (2940:13448): the compose pill A.1 (738px) and the profile search pill (381px), 32px apart.
 * Both are display-only for now (#12 writes a Kudo, a later plan wires the search): aria-disabled, no handler,
 * same look as an enabled pill.
 */
export function KudosComposeTrigger({ copy }: { copy: KudosComposeCopy }) {
  return (
    // mm:2940:13448
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-8">
      {/* mm:2940:13449 */}
      <button
        type="button"
        aria-disabled="true"
        data-testid="kudos-compose-trigger"
        className={`${PILL} lg:flex-[738_1_738px] ${FOCUS_RING}`}
      >
        {/* mm:I2940:13449;186:2759 */}
        <Image src="/images/kudos/icon-pen.svg" alt="" width={24} height={24} className="shrink-0" />
        {/* mm:I2940:13449;186:2760 */}
        <span className="min-w-0 flex-1 truncate">{copy.placeholder}</span>
      </button>
      {/* mm:2940:13450 */}
      <button type="button" aria-disabled="true" className={`${PILL} lg:flex-[381_1_381px] ${FOCUS_RING}`}>
        {/* mm:I2940:13450;186:2759 */}
        <Image src="/images/kudos/icon-search.svg" alt="" width={24} height={24} className="shrink-0" />
        {/* mm:I2940:13450;186:2760 */}
        <span className="min-w-0 flex-1 truncate">{copy.searchPlaceholder}</span>
      </button>
    </div>
  );
}
