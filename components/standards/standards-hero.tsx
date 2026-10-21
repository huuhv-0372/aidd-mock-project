import Image from "next/image";

/*
 * Figma key visual of "Tiêu chuẩn chung" (1440 artboard): artwork band 1440x512 from y=24, a 627px "Cover" fade
 * into #00101a, logo 451x200 at x=144 y=184, content block 120px below the logo. The artwork is the Awards band
 * key visual (2880x1094 = 1440x547 at 2x; object-cover centred crops ~35px at lg). From lg the section slides
 * under the translucent header (like HomeHero); below lg there is no Figma frame, so the band starts at the top
 * with a readability scrim. The band and Cover overhang the section (Figma's Cover overlaps the content area):
 * the content wrapper is positioned so it paints above them.
 */
export function StandardsHero() {
  return (
    // mm:1161:8944 keyvisual (web Figma, no MoMorph frame)
    <section className="relative isolate w-full font-montserrat lg:-mt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden lg:top-6 lg:h-[512px]"
      >
        <Image
          src="/images/awards/keyvisual-bg.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[75%_100%] lg:object-center"
        />
        <div className="absolute inset-0 bg-login-bg/50 lg:hidden" />
        {/* Cover: 627px from the section top at lg (the band starts 24px lower); fully #00101a by y~470, art clear above y~300 */}
        <div className="absolute inset-x-0 bottom-0 h-full bg-[linear-gradient(0deg,#00101a_0,rgb(0_16_26/0)_45%)] lg:-top-6 lg:bottom-auto lg:h-[627px] lg:bg-[linear-gradient(0deg,#00101a_25%,rgb(0_19_32/0)_52.79%)]" />
      </div>
      <div className="mx-auto w-full max-w-[1512px] px-4 pt-10 pb-8 md:px-12 lg:pt-[184px] lg:pb-[120px] xl:px-36">
        <Image
          src="/images/home/root-further-logo.png"
          alt="ROOT FURTHER"
          width={451}
          height={200}
          preload
          sizes="(min-width: 768px) 451px, 80vw"
          className="h-auto w-4/5 max-w-[451px] md:w-full"
        />
      </div>
    </section>
  );
}
