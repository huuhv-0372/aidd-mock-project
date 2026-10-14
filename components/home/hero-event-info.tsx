import type { Dictionary } from "@/messages/vi";

/* Figma sits the 24px label 2px above the bottom of the 32px value row (not centred). */
function InfoPair({ label, value, gap = "gap-1" }: { label: string; value: string; gap?: string }) {
  return (
    <p className={`flex items-center ${gap}`}>
      <span className="mb-0.5 self-end text-base leading-6 font-bold tracking-[0.15px] text-white">{label}</span>
      <span className="text-2xl leading-8 font-bold text-login-accent">{value}</span>
    </p>
  );
}

export function HeroEventInfo({ info }: { info: Dictionary["home"]["eventInfo"] }) {
  return (
    // mm:2167:9053
    <div className="flex max-w-[637px] flex-col gap-2">
      {/* mm:2167:9054 */}
      <div className="flex flex-wrap items-center gap-x-[60px] gap-y-2">
        {/* mm:2167:9055 */}
        <InfoPair label={info.time.label} value={info.time.value} />
        {/* mm:2167:9058 */}
        <InfoPair label={info.venue.label} value={info.venue.value} gap="gap-1.5" />
      </div>
      {/* mm:2167:9061 */}
      <p className="text-base leading-6 font-bold tracking-[0.5px] text-white">
        {info.broadcast}
      </p>
    </div>
  );
}
