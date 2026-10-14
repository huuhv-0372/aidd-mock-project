import Image from "next/image";
import { GLOW_SHADOW } from "./shell-class-names";
import { IconPen } from "./shell-icons";

/* Floating widget (button only; its quick-action menu belongs to the floating-action plan). */
export function WidgetButton() {
  return (
    // mm:5022:15169
    <button
      type="button"
      data-testid="widget-button"
      aria-label="Viết Kudos / Thể lệ SAA"
      className={`fixed right-[19px] bottom-6 z-40 flex h-16 min-w-[106px] cursor-pointer items-center justify-center gap-2 rounded-full bg-login-accent p-4 text-login-bg hover:bg-[#fff3c4] hover:shadow-[0_4px_8px_rgb(0_0_0/0.35),0_0_10px_#fae287] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 ${GLOW_SHADOW}`}
    >
      {/* mm:I5022:15169;214:3839;186:1935 */}
      <span className="flex items-center gap-2" aria-hidden="true">
        {/* mm:I5022:15169;214:3839;186:1763 */}
        <IconPen />
        {/* mm:I5022:15169;214:3839;186:1568 */}
        <span className="text-2xl leading-8 font-bold">/</span>
      </span>
      {/* mm:I5022:15169;214:3839;186:1766 */}
      {/* mm:I5022:15169;214:3839;186:1766;214:3762 */}
      <Image src="/images/home/icon-kudos-logo.svg" alt="" width={20} height={19} aria-hidden="true" />
    </button>
  );
}
