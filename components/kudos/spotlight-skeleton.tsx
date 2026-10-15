/* Suspense fallback for SpotlightSection: same frame size as Figma B.6 + B.7, pulse only when motion is allowed. */
const NAME_BARS = [
  "top-[110px] left-[22%] w-24",
  "top-[150px] left-[48%] w-20",
  "top-[190px] left-[70%] w-28",
  "top-[230px] left-[30%] w-16",
  "top-[270px] left-[58%] w-24",
  "top-[310px] left-[80%] w-20",
] as const;

export function SpotlightSkeleton() {
  return (
    <section
      aria-busy="true"
      className="mx-auto flex w-full max-w-[1512px] flex-col gap-8 px-4 font-montserrat md:gap-[63px] md:px-12 xl:px-36"
    >
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <div className="h-8 w-64 rounded bg-white/10" />
        <div className="h-px w-full bg-login-divider" />
        <div className="h-12 w-full max-w-[576px] rounded bg-login-accent/20 md:h-16" />
      </div>
      <div
        aria-hidden="true"
        className="relative h-[420px] w-full max-w-[1157px] overflow-clip rounded-[47.14px] border border-home-border bg-[#030b0f] md:h-[548px]"
      >
        <div className="absolute inset-0 motion-safe:animate-pulse">
          <div className="absolute top-3 left-1/2 h-11 w-[217px] -translate-x-1/2 rounded bg-white/10 md:top-[14px]" />
          <div className="absolute top-[68px] left-4 h-11 w-[219px] rounded-[46.4px] border-[0.68px] border-home-border bg-[rgb(255_234_158/0.1)] md:top-[26px] md:left-[25px] md:h-[39px]" />
          {NAME_BARS.map((position) => (
            <div key={position} className={`absolute h-2 rounded bg-white/15 ${position}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
