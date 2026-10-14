import Image from "next/image";
import Link from "next/link";
import { SUN_KUDOS_PATH } from "@/lib/navigation/routes";
import { FOCUS_RING, PRIMARY_CTA_HOVER } from "./shell-class-names";
import type { ShellCopy } from "./shell-links";
import { IconArrowUpRight } from "./shell-icons";

/* Sun* Kudos promo card (Figma 1120x500 inside the 1224px column). */
export function KudosSection({ copy }: { copy: ShellCopy }) {
  return (
    // mm:3390:10349
    <section
      data-testid="kudos-section"
      className="relative mx-auto mt-20 w-full max-w-[1512px] px-4 font-montserrat md:px-12 lg:mt-[120px] xl:px-36"
    >
      {/* mm:I3390:10349;313:8415 */}
      <div className="relative isolate mx-auto flex min-h-[500px] w-full max-w-[1120px] items-center justify-between gap-8 overflow-hidden rounded-2xl bg-[#0f0f0f] p-6 md:px-16 md:py-[46px]">
        {/* mm:I3390:10349;313:8416 */}
        <Image
          src="/images/home/kudos-bg.png"
          alt=""
          fill
          sizes="(min-width: 1280px) 1120px, 100vw"
          className="-z-10 object-cover object-left"
        />
        {/* mm:I3390:10349;313:8419 */}
        <div className="flex w-full max-w-[457px] flex-col gap-8">
          {/* mm:I3390:10349;313:8420 */}
          <div className="flex flex-col gap-4">
            {/* mm:I3390:10349;313:8421 */}
            <p className="text-xl leading-8 font-bold text-white md:text-2xl">{copy.kudos.eyebrow}</p>
            {/* mm:I3390:10349;313:8422 */}
            <h2 className="text-5xl leading-[1.12] font-bold tracking-[-0.25px] text-login-accent md:text-[57px] md:leading-16">
              {copy.kudos.title}
            </h2>
            {/* mm:I3390:10349;313:8423 */}
            <p className="whitespace-pre-line text-justify text-base leading-6 font-bold tracking-[0.5px] text-white">
              {copy.kudos.body}
            </p>
          </div>
          {/* mm:I3390:10349;313:8424 */}
          <div>
            {/* mm:I3390:10349;313:8426 */}
            <Link
              href={SUN_KUDOS_PATH}
              className={`inline-flex min-h-14 items-center gap-2 rounded bg-login-accent p-4 text-base leading-6 font-bold tracking-[0.15px] text-login-bg ${PRIMARY_CTA_HOVER} motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 ${FOCUS_RING}`}
            >
              {/* mm:I3390:10349;313:8426;186:1568 */}
              {copy.details}
              {/* mm:I3390:10349;313:8426;186:1766 */}
              <IconArrowUpRight />
            </Link>
          </div>
        </div>
        {/* mm:I3390:10349;329:2948 */}
        <Image
          src="/images/home/kudos-logo.svg"
          alt=""
          width={364}
          height={74}
          className="hidden h-auto w-[280px] shrink-0 translate-y-[3px] lg:mr-5 lg:block xl:w-[364px]"
        />
      </div>
    </section>
  );
}
