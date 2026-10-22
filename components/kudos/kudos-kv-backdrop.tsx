import Image from "next/image";

/*
 * Key-visual band behind the Kudos pages (Figma Keyvisual 1210:12613: 1440x512 at the page top, 432px below lg where the header is a
 * normal row). Absolutely positioned and `-z-10`, so the parent must be `relative isolate`. `kv-bg.webp` is 1440x512 already.
 * The Cover (Figma 1210:12612) is 957px tall with its bottom edge on the band's bottom edge, clipped by the band; its gradient is
 * per page, Figma overrides it on the Profile frames:
 * - `board` (Sun* Kudos board, View Kudo): `linear-gradient(25deg, #00101A 14.74%, transparent 47.8%)`.
 * - `profile`: MoMorph states `8deg, #00101A 8.6%, transparent 37.25%`; sampled against the 1440 export it fits best at 6deg
 *   (RMS 5.0 vs 7.8 at 8deg, 29.7 for the board gradient), and it fades the band into #00101A at its bottom edge like the design.
 * `dimmed` adds the 80% #00101A overlay of the View Kudo frame (owner export, 2026-10-21). `preload` marks the image as LCP.
 */
const COVER = {
  board: "bg-[linear-gradient(25deg,#00101a_14.74%,rgb(0_19_32/0)_47.8%)]",
  profile: "bg-[linear-gradient(6deg,#00101a_8.6%,rgb(0_19_32/0)_37.25%)]",
} as const;

export type KudosKvCover = keyof typeof COVER;

export function KudosKvBackdrop({
  cover = "board",
  dimmed = false,
  preload = false,
}: {
  cover?: KudosKvCover;
  dimmed?: boolean;
  preload?: boolean;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[432px] overflow-hidden lg:h-[512px]">
      {/* mm:I2940:13432;2167:5141 */}
      <Image
        src="/images/kudos/kv-bg.webp"
        alt=""
        fill
        preload={preload}
        sizes="100vw"
        className="object-cover object-[75%_50%] lg:object-center"
      />
      {/* mm:I2940:13432;1210:12612 */}
      <div className={`absolute inset-x-0 bottom-0 h-[957px] ${COVER[cover]}`} />
      {dimmed && <div className="absolute inset-0 bg-[rgb(0_16_26/0.8)]" />}
    </div>
  );
}

/* The load-error line of a Kudos page is a bare `<p role="alert">`: dress it as a cream card so it reads on the dark page. */
export const KUDOS_PAGE_ALERT_CARD =
  "[&>[role=alert]]:rounded-3xl [&>[role=alert]]:bg-kudos-card [&>[role=alert]]:p-10 [&>[role=alert]]:text-center [&>[role=alert]]:text-base [&>[role=alert]]:leading-6 [&>[role=alert]]:font-bold [&>[role=alert]]:text-login-bg";
