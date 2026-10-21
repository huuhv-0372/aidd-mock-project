import Image from "next/image";
import Link from "next/link";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { HOME_PATH } from "@/lib/navigation/routes";

type ErrorScreenProps = {
  title: string;
  body: string;
  homeLabel: string;
  illustrationSrc: string;
  /** Uppercase the title with CSS only (the 404 Figma title is "NOT FOUND"; the stored VI text stays sentence case). */
  uppercaseTitle?: boolean;
};

/*
 * Shared frame of the 404 and 403 pages (Figma 1378:5063 / 2182:9291, 1440 artboard): ribbon artwork
 * (error-bg.webp, a 10% layer already baked into the file's alpha) over the #00101A page colour,
 * then a centred column: title, 702x545 illustration, two-line description. The home button is not in
 * Figma (kept on request), so it sits under the description with a 32px gap. No header/footer.
 * The vertical offsets (lg:pt/pb) centre the column so the title lands ~125px from the top at 917px tall.
 */
export function ErrorScreen({ title, body, homeLabel, illustrationSrc, uppercaseTitle = false }: ErrorScreenProps) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-x-clip bg-login-bg px-4 py-12 text-center font-montserrat lg:pt-[115px] lg:pb-6">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/images/errors/error-bg.webp" alt="" fill preload sizes="100vw" className="object-cover" />
      </div>
      <h1
        className={`text-4xl leading-tight font-bold text-white md:text-[57px] md:leading-[62px] md:tracking-[-0.25px] ${uppercaseTitle ? "uppercase" : ""}`}
      >
        {title}
      </h1>
      <Image
        src={illustrationSrc}
        alt=""
        width={702}
        height={545}
        preload
        sizes="(min-width: 750px) 702px, calc(100vw - 2rem)"
        className="h-auto w-full max-w-[702px]"
      />
      <p className="max-w-[580px] text-lg leading-7 font-bold text-white md:-mt-0.5 md:text-2xl md:leading-[33.6px]">{body}</p>
      <Link
        href={HOME_PATH}
        className={`mt-8 flex min-h-11 min-w-11 items-center justify-center rounded bg-login-accent px-6 py-3 text-base leading-6 font-bold text-login-bg hover:bg-[#fff3c4] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
      >
        {homeLabel}
      </Link>
    </main>
  );
}
