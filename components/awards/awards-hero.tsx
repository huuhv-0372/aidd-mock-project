import Image from "next/image";
import { AwardsTitle } from "./awards-title";

/*
 * Figma 547px band under the header: key visual artwork, bottom fade into the page background,
 * "ROOT FURTHER" logo (338x150) and the title block A, 120px apart at 1440.
 * The artwork is the Figma 2x export of mm:2167:5138 (2880x1094): at lg+ the band is 1440x547, so
 * object-cover centred maps it 1:1. Below lg there is no Figma frame; the crop leans to the
 * right/bottom so the ribbons stay visible behind the logo and title.
 */
export function AwardsHero() {
  return (
    // mm:313:8437
    <section className="relative isolate w-full font-montserrat">
      <div className="absolute inset-0 -z-10">
        {/* mm:2167:5138 */}
        <Image
          data-testid="awards-keyvisual"
          src="/images/awards/keyvisual-bg.webp"
          alt="Keyvisual Sun* Annual Award 2025"
          fill
          preload
          sizes="100vw"
          className="object-cover object-[75%_100%] lg:object-center"
        />
        {/* mm:313:8439 */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#00101a_-4.23%,rgb(0_19_32/0)_52.79%)]" />
      </div>
      {/* mm:313:8449 */}
      <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-16 px-4 pt-10 pb-11 md:px-12 lg:min-h-[547px] lg:gap-[120px] lg:pt-[104px] xl:px-36">
        {/* mm:313:8450 */}
        <Image
          src="/images/home/root-further-logo.png"
          alt="ROOT FURTHER"
          width={338}
          height={150}
          preload
          sizes="(min-width: 768px) 338px, 60vw"
          className="h-auto w-3/5 max-w-[338px]"
        />
        <AwardsTitle />
      </div>
    </section>
  );
}
