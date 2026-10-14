import Image from "next/image";
import Link from "next/link";
import { Montserrat_Alternates } from "next/font/google";
import { HOME_PATH } from "@/lib/navigation/routes";
import { FOCUS_RING, GLOW_ON_HOVER } from "./shell-class-names";
import { HomeLink } from "./home-link";
import { getFooterLinks, type ShellCopy } from "./shell-links";

const montserratAlternates = Montserrat_Alternates({
  subsets: ["latin", "vietnamese"],
  weight: ["700"],
});

const FOOTER_LINK = `flex min-h-11 items-center rounded p-4 text-base leading-6 font-bold tracking-[0.15px] text-white hover:bg-[rgb(255_234_158/0.1)] ${GLOW_ON_HOVER} motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`;

/* Rendered outside <main> by the page so it keeps the contentinfo landmark. */
export function SiteFooter({ copy }: { copy: ShellCopy }) {
  return (
    // mm:5001:14800
    <footer className="mt-20 w-full border-t border-login-divider font-montserrat xl:mt-[125px]">
      <div className="mx-auto flex w-full max-w-[1512px] flex-col items-center gap-6 px-4 py-6 md:px-12 xl:flex-row xl:flex-wrap xl:justify-between xl:px-[90px] xl:py-10">
        {/* mm:I5001:14800;342:1407 */}
        <div className="flex flex-col items-center gap-6 xl:flex-row xl:gap-20">
          {/* mm:I5001:14800;342:1408 */}
          <HomeLink className={`flex h-16 items-center rounded ${FOCUS_RING}`}>
            {/* mm:I5001:14800;342:1408;178:1030 */}
            <Image src="/images/home/logo-footer.png" alt={copy.logoAlt} width={69} height={64} sizes="69px" />
          </HomeLink>
          {/* mm:I5001:14800;342:1409 */}
          <nav aria-label={copy.footer.ariaLabel} className="flex flex-wrap justify-center gap-x-2 gap-y-1 xl:gap-x-12">
            {getFooterLinks(copy).map(({ label, href }) =>
              href === HOME_PATH ? (
                <HomeLink key={label} className={FOOTER_LINK}>
                  {label}
                </HomeLink>
              ) : (
                <Link key={label} href={href} className={FOOTER_LINK}>
                  {label}
                </Link>
              ),
            )}
          </nav>
        </div>
        {/* mm:I5001:14800;342:1413 */}
        <p className={`${montserratAlternates.className} text-center text-base leading-6 font-bold text-white`}>
          {copy.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
