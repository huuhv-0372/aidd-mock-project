import Image from "next/image";
import { AWARD_CARDS } from "@/components/home/award-cards-data";
import { GLOW_SHADOW } from "@/components/site-shell/shell-class-names";
import type { AwardSlug } from "@/lib/navigation/routes";

const TILE_SIZE = 336; // Figma tile edge; the name artwork is scaled relative to it.

/*
 * Award picture (Figma Picture-Award, 336x336): shared tile background + the award name artwork.
 * Both layers reuse the Homepage exports (same Figma component 81:2443). `award-image` is the
 * background <img>, which fills the tile; the 0.955px gold border is an overlay so the img is exactly 336px.
 */
export function AwardTile({ slug, title }: { slug: AwardSlug; title: string }) {
  const name = AWARD_CARDS.find((card) => card.slug === slug)?.name;
  return (
    // mm:I313:8467;214:2525
    <div
      className={`relative aspect-square w-full max-w-[336px] shrink-0 overflow-hidden rounded-3xl mix-blend-screen lg:w-[336px] lg:self-start ${GLOW_SHADOW}`}
    >
      {/* mm:I313:8467;214:2525;81:2442 */}
      <Image
        data-testid="award-image"
        src="/images/home/award-bg.png"
        alt={title}
        fill
        sizes="336px"
        className="object-cover"
      />
      {name ? (
        // mm:I313:8467;214:2525;214:666
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={name.src}
            alt=""
            width={name.width}
            height={name.height}
            sizes="232px"
            style={{ width: `${((name.width / TILE_SIZE) * 100).toFixed(1)}%`, height: "auto" }}
          />
        </div>
      ) : null}
      <span aria-hidden="true" className="absolute inset-0 rounded-3xl border-[0.955px] border-login-accent" />
    </div>
  );
}
