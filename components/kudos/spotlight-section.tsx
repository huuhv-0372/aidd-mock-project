import { formatKudoTime } from "@/lib/kudos/format-kudo-time";
import type { KudosSpotlight } from "@/lib/kudos/kudo-types";
import { layoutSpotlight } from "@/lib/kudos/spotlight-layout";
import { kudoDetailHref } from "@/lib/navigation/routes";
import { KudosSectionHeader } from "./kudos-section-header";
import { SpotlightBoard } from "./spotlight-board";
import type { SpotlightNodeData } from "./spotlight-node";
import { SpotlightTicker } from "./spotlight-ticker";

/** All Spotlight strings in one object, fed from the VI/EN dictionaries. */
export type SpotlightCopy = {
  eyebrow: string;
  title: string;
  unit: string;
  searchLabel: string;
  panZoomLabel: string;
  empty: string;
  noResults: string;
  loadError: string;
  tickerSuffix: string;
  unknownName: string;
};

type SpotlightSectionProps = {
  /** Pending `fetchKudosSpotlight` read; resolves to `null` when the block failed to load (it never rejects). */
  spotlight: Promise<KudosSpotlight | null>;
  copy: SpotlightCopy;
};

/*
 * Figma B.6 `2940:13476` header + B.7 `2940:14174` board. Positions, links and time labels are resolved
 * here (server) so the client board only receives plain data. Async: render it inside a `<Suspense>`
 * (SpotlightSkeleton) so the rest of the page does not wait for this read.
 */
export async function SpotlightSection({ spotlight: pending, copy }: SpotlightSectionProps) {
  const spotlight = await pending;
  const recipients = spotlight?.recipients ?? [];
  const layout = layoutSpotlight(recipients);
  const byId = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const nodes = layout.nodes.flatMap((placed): SpotlightNodeData[] => {
    const recipient = byId.get(placed.id);
    if (!recipient) return [];
    return [
      {
        ...placed,
        name: recipient.full_name ?? copy.unknownName,
        href: kudoDetailHref(recipient.last_kudo_id),
        timeLabel: formatKudoTime(recipient.last_received_at),
      },
    ];
  });

  return (
    <section
      aria-labelledby="spotlight-heading"
      className="mx-auto flex w-full max-w-[1512px] flex-col gap-8 px-4 font-montserrat md:gap-[63px] md:px-12 xl:px-36"
    >
      {/* mm:2940:13476 */}
      <KudosSectionHeader eyebrow={copy.eyebrow} title={copy.title} titleId="spotlight-heading" />
      {/* mm:2940:14174 */}
      <SpotlightBoard
        total={spotlight ? spotlight.total : null}
        nodes={nodes}
        canvas={{ width: layout.width, height: layout.height }}
        copy={{
          title: copy.title,
          unit: copy.unit,
          searchLabel: copy.searchLabel,
          panZoomLabel: copy.panZoomLabel,
          noResults: copy.noResults,
        }}
        message={spotlight ? copy.empty : copy.loadError}
        ticker={
          <SpotlightTicker
            items={spotlight?.recent ?? []}
            suffix={copy.tickerSuffix}
            unknownName={copy.unknownName}
          />
        }
      />
    </section>
  );
}
