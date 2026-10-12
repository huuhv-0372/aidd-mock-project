import Image from "next/image";
import type { ReactNode } from "react";

/* `children` is the slot where the Google login control sits (below the intro text). */
export function LoginHero({ children }: { children: ReactNode }) {
  return (
    // mm:662:14393
    <main className="flex flex-1 flex-col font-montserrat">
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-4 py-12 md:px-12 lg:px-36 lg:pt-26 lg:pb-24">
        {/* mm:662:14394 */}
        <div className="flex flex-col gap-10 lg:gap-20">
          {/* mm:662:14395 */}
          <h1 className="m-0">
            {/* mm:2939:9548 */}
            <Image
              data-testid="hero-key-visual"
              src="/images/login/root-further-logo.png"
              alt="ROOT FURTHER"
              width={451}
              height={200}
              sizes="(min-width: 768px) 451px, 80vw"
              preload
              className="h-auto w-4/5 max-w-[451px] md:w-full"
            />
          </h1>
          {/* mm:662:14755 */}
          <div className="flex flex-col items-start gap-6 pl-4">
            {/* mm:662:14753 */}
            <div className="max-w-[480px] text-lg leading-8 font-bold tracking-[0.5px] text-white md:text-xl md:leading-10">
              <p>Bắt đầu hành trình của bạn cùng SAA 2025.</p>
              <p>Đăng nhập để khám phá!</p>
            </div>
            {/* mm:662:14425 */}
            <div className="flex flex-col items-start gap-4">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
