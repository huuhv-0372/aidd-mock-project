import Image from "next/image";
import type { ReactNode } from "react";
import { KudosKvBackdrop } from "./kudos-kv-backdrop";

export type KudosKvCopy = { title: string; logoAlt: string };

/*
 * Figma A (2940:13437) on the key-visual band (2940:13432): 1440x512 at the page top, so from lg the first 80px sit
 * behind the translucent header (same pattern as the homepage hero: `lg:-mt-20` + `lg:pt-[184px]`, Frame 532 at y=184).
 * Below lg the header is a normal row, so the band starts under it and keeps 432px.
 */
export function KudosKvBanner({ copy, children }: { copy: KudosKvCopy; children: ReactNode }) {
  return (
    // mm:2940:13434
    <section data-testid="kudos-kv" className="relative isolate w-full font-montserrat lg:-mt-20">
      <KudosKvBackdrop preload />
      <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-16 px-4 pt-10 md:px-12 lg:pt-[184px] xl:px-36">
        {/* mm:2940:13437 */}
        <div className="flex flex-col gap-2.5">
          {/* mm:2940:13439 */}
          <h1 className="text-2xl leading-8 font-bold text-login-accent md:text-4xl md:leading-11">{copy.title}</h1>
          {/* mm:2940:13440 */}
          <Image
            src="/images/kudos/kudos-logo.svg"
            alt={copy.logoAlt}
            width={593}
            height={106}
            preload
            sizes="(min-width: 768px) 593px, 80vw"
            className="h-auto w-4/5 max-w-[593px]"
          />
        </div>
        {children}
      </div>
    </section>
  );
}
