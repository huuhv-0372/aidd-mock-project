import Image from "next/image";
import type { Dictionary } from "@/messages/vi";

const BODY = "whitespace-pre-line text-justify text-base leading-7 font-bold text-white md:text-xl md:leading-8 xl:text-2xl";

/* `relative` so it paints above the hero backdrop that runs on behind this block. */
export function RootFurtherContent({ copy }: { copy: Dictionary["home"]["rootFurther"] }) {
  return (
    // mm:3204:10152
    <section
      data-testid="root-further-content"
      className="relative mx-auto mt-16 flex w-full max-w-[1512px] flex-col items-center gap-8 px-4 font-montserrat md:px-12 lg:mt-[102px] xl:px-36"
    >
      {/* mm:3204:10153 */}
      <div className="flex w-[290px] max-w-full flex-col items-start">
        {/* mm:3204:10155 */}
        <Image
          src="/images/home/root-text.png"
          alt=""
          width={189}
          height={67}
          sizes="189px"
          className="ml-[17.6%] h-auto w-[65.2%]"
        />
        {/* mm:3204:10154 */}
        <Image
          src="/images/home/further-text.png"
          alt=""
          width={290}
          height={67}
          sizes="290px"
          className="h-auto w-full"
        />
      </div>
      {/* mm:5001:14827 */}
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-8">
        {/* mm:3204:10156 */}
        <p className={BODY}>{copy.intro}</p>
        {/* mm:3204:10161 */}
        <p className="pt-0.5 text-center text-xl leading-8 font-bold text-white md:text-2xl">
          <span className="ps-[0.26em]">{copy.quote.line1}</span>
          <br />
          <span className="ps-[0.26em] text-base md:text-xl">{copy.quote.line2}</span>
        </p>
        {/* mm:3204:10162 */}
        <p className={BODY}>{copy.outro}</p>
      </div>
    </section>
  );
}
