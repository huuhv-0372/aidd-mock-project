import Image from "next/image";
import Link from "next/link";
import { awardHref } from "@/lib/navigation/routes";
import type { AwardCardData } from "./award-cards-data";
import { FOCUS_RING, GLOW_SHADOW } from "@/components/site-shell/shell-class-names";
import { IconArrowUpRight } from "@/components/site-shell/shell-icons";

const TILE_SIZE = 336; // Figma tile edge; name images are scaled relative to it.

/*
 * The wrapper carries data-testid="award-card" and contains exactly ONE anchor
 * (tile image, title, description and "Chi tiết" all live inside it).
 */
export function AwardCard({ award }: { award: AwardCardData }) {
  const { slug, title, description, name } = award;
  return (
    // mm:2167:9075
    <div
      data-testid="award-card"
      className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1"
    >
      <Link
        href={awardHref(slug)}
        className={`flex flex-col gap-4 rounded-3xl hover:drop-shadow-[0_0_12px_rgb(250_226_135/0.45)] md:gap-6 motion-safe:transition-[filter] motion-safe:duration-200 ${FOCUS_RING}`}
      >
        {/* mm:I2167:9075;214:1019 */}
        <div
          className={`relative aspect-square w-full overflow-hidden rounded-3xl border-[0.955px] border-login-accent mix-blend-screen ${GLOW_SHADOW}`}
        >
          {/* mm:I2167:9075;214:1019;81:2442 */}
          <Image
            src="/images/home/award-bg.png"
            alt=""
            fill
            sizes="(min-width: 1280px) 336px, (min-width: 768px) 45vw, 45vw"
            className="object-cover"
          />
          {/* mm:I2167:9075;214:1019;214:666 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={name.src}
              alt={title}
              width={name.width}
              height={name.height}
              sizes="232px"
              style={{ width: `${((name.width / TILE_SIZE) * 100).toFixed(1)}%`, height: "auto" }}
            />
          </div>
        </div>
        {/* mm:I2167:9075;214:1020 */}
        <div className="flex flex-col gap-1">
          {/* mm:I2167:9075;214:1021 */}
          <h3 className="text-base leading-6 font-normal text-login-accent md:text-2xl md:leading-8">
            {title}
          </h3>
          {/* mm:I2167:9075;214:1022 */}
          <p className="text-xs leading-5 font-normal tracking-[0.5px] text-white md:text-base md:leading-6">
            {description}
          </p>
          {/* mm:I2167:9075;214:1023 */}
          <span className="flex min-h-11 items-center gap-1 py-2 text-base leading-6 font-medium tracking-[0.15px] text-white md:py-4">
            {/* mm:I2167:9075;214:1023;186:1439 */}
            Chi tiết
            {/* mm:I2167:9075;214:1023;186:1441 */}
            <IconArrowUpRight />
          </span>
        </div>
      </Link>
    </div>
  );
}
