import Image from "next/image";

/*
 * Figma B.7 `2940:14174` backdrop (1157x548 board, clipped by the board's radius). Positions are the Figma offsets
 * as a share of the 1157x548 board so the composition scales with a narrower board instead of stretching.
 *   Layer 1 `2940:14173`: 1819x583 at (-64, 0), art under a 70% black wash.
 *   Layer 2 `2940:14181`: 1100x618 at (-35, -35), network lines with a `screen` blend (the black drops out).
 *   Its image fill is ~30% opaque in Figma (not in the exported CSS): the Figma render lifts the board's mean
 *   luminance by ~0.009 and peaks at ~0.33-0.55, against ~0.028 and 1.0 for the raw image at full strength.
 * Purely decorative and `pointer-events-none`; the name nodes, total, search and ticker are later siblings,
 * so they paint above both layers and are never dimmed by the wash or blended.
 */
export function SpotlightBoardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-clip">
      {/* mm:2940:14173 */}
      <div className="absolute top-0 -left-[5.532%] h-[106.387%] w-[157.218%]">
        <Image
          src="/images/kudos/spotlight/spotlight-leaves-art.webp"
          alt=""
          fill
          sizes="(min-width: 1157px) 1819px, 160vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      {/* mm:2940:14181 */}
      <div className="absolute -top-[6.387%] -left-[3.025%] h-[112.774%] w-[95.074%] opacity-30 mix-blend-screen">
        <Image
          src="/images/kudos/spotlight/spotlight-network-art.webp"
          alt=""
          fill
          sizes="(min-width: 1157px) 1100px, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
