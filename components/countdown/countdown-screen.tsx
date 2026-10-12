import Image from "next/image";
import type { ReactNode } from "react";

/*
 * Unit scale --s for the responsive one-row countdown (see countdown-unit.tsx):
 * mobile-first 0.5, md 0.75, lg+ 1 (= Figma 1512px artboard values).
 */
export function CountdownScreen({ children }: { children: ReactNode }) {
  return (
    // mm:2268:35127
    <main className="relative isolate flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-countdown-bg px-4 pb-[17vh] [--s:0.5] md:[--s:0.75] lg:[--s:1]">
      {/* mm:2268:35129 */}
      <Image
        src="/images/countdown/countdown-background.png"
        alt=""
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/* mm:2268:35130 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(18deg,#00101a_15.48%,rgba(0,18,29,0.46)_52.13%,rgba(0,19,32,0)_63.41%)]"
      />
      {/* mm:2268:35131 */}
      <div className="flex w-full max-w-[1512px] flex-col items-center justify-center">
        {/* mm:2268:35136 */}
        <div className="flex w-full flex-col items-center justify-center gap-6">
          {/* mm:2268:35137 */}
          <h1 className="text-center font-montserrat text-xl leading-7 font-bold text-white md:text-3xl md:leading-10 lg:text-[36px] lg:leading-[48px]">
            Sự kiện sẽ bắt đầu sau
          </h1>
          {children}
        </div>
      </div>
    </main>
  );
}
