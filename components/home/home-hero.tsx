import Image from "next/image";
import type { ReactNode } from "react";
import { HeroCtaLinks } from "./hero-cta-links";
import { HeroEventInfo } from "./hero-event-info";

/*
 * Key visual + countdown + event info + CTAs (Figma 1512px artboard, content column 1224px).
 * `relative isolate` keeps the backdrop (-z-10) inside this section; it is taller than the
 * section and runs on behind the Root Further block, so the later sections are `relative` too.
 * From lg the section slides 80px under the sticky header (header is translucent).
 */
export function HomeHero({ countdown }: { countdown: ReactNode }) {
  return (
    // mm:2167:9030
    <section className="relative isolate w-full font-montserrat lg:-mt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px] md:h-[1480px]"
      >
        {/* mm:2167:9027 */}
        <div className="absolute inset-x-0 top-0 h-[94%]">
          {/* mm:2167:9028 */}
          <Image
            src="/images/home/keyvisual-bg.webp"
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover object-top-right md:object-top"
          />
        </div>
        {/* readability scrim below md (text sits over the artwork) */}
        <div className="absolute inset-0 bg-login-bg/50 md:hidden" />
        {/* mm:2167:9029 */}
        <div className="absolute inset-0 bg-[linear-gradient(12deg,#00101a_23.7%,rgb(0_18_29/0.46)_38.34%,rgb(0_19_32/0)_48.92%)]" />
      </div>
      {/* mm:2167:9031 */}
      <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-10 px-4 pt-8 md:px-12 lg:pt-[184px] xl:px-36">
        {/* mm:2167:9032 */}
        <h1 className="m-0">
          {/* mm:2788:12911 */}
          <Image
            data-testid="hero-key-visual"
            src="/images/home/root-further-logo.png"
            alt="ROOT FURTHER"
            width={451}
            height={200}
            preload
            sizes="(min-width: 768px) 451px, 80vw"
            className="h-auto w-4/5 max-w-[451px] md:w-full"
          />
        </h1>
        {/* mm:2167:9034 */}
        <div className="flex flex-col gap-4">
          {countdown}
          <HeroEventInfo />
        </div>
        <HeroCtaLinks />
      </div>
    </section>
  );
}
