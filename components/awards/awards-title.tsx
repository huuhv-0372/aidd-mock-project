/*
 * Figma A: small subtitle, 1px divider, large gold h1. The subtitle is stored lower-case (the pinned
 * selector contract) and `capitalize` renders it as the Figma "Sun* Annual Awards 2025".
 */
export function AwardsTitle({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    // mm:313:8453
    <div data-testid="awards-title" className="flex w-full flex-col items-center gap-4 text-center">
      {/* mm:313:8454 */}
      <p className="text-xl leading-8 font-bold text-white capitalize md:text-2xl">{subtitle}</p>
      {/* mm:313:8455 */}
      <div aria-hidden="true" className="h-px w-full bg-login-divider" />
      {/* mm:313:8457 */}
      <h1 className="text-3xl leading-10 font-bold tracking-[-0.25px] text-login-accent md:text-5xl md:leading-14 lg:text-[57px] lg:leading-16">
        {title}
      </h1>
    </div>
  );
}
