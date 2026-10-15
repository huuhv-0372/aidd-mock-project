import Link from "next/link";

/** One recipient on the board: server-computed position (spotlight-layout) plus display strings. */
export type SpotlightNodeData = {
  id: string;
  name: string;
  href: string;
  /** `HH:mm - MM/DD/YYYY` (Vietnam time) of the last Kudo received. */
  timeLabel: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
};

type SpotlightNodeProps = {
  node: SpotlightNodeData;
  match: boolean;
  /** Fired on keyboard focus only, so the board can bring the node into view. */
  onKeyboardFocus: () => void;
};

/* Nodes near the top edge open the tooltip downwards so the frame does not clip it. */
const TOOLTIP_FLIP_TOP = 44;

/*
 * Figma B.7 name label (Montserrat 700, white, letter-spacing 0.208px; hover/highlight #F17676).
 * The anchor carries the contract attributes; the inner span repeats data-match as the styling hook.
 * Documented exception to the 44px touch rule: names sit 16-29px tall on a dense, pannable canvas (Figma size).
 */
export function SpotlightNode({ node, match, onKeyboardFocus }: SpotlightNodeProps) {
  const matchValue = match ? "true" : "false";
  const below = node.top < TOOLTIP_FLIP_TOP;
  return (
    <Link
      data-testid="spotlight-node"
      data-match={matchValue}
      href={node.href}
      prefetch={false}
      draggable={false}
      aria-label={node.timeLabel ? `${node.name}, ${node.timeLabel}` : node.name}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) onKeyboardFocus();
      }}
      className="group absolute z-0 rounded-sm text-center font-bold tracking-[0.2px] text-white outline-offset-2 hover:z-20 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-login-accent"
      style={{
        left: node.left,
        top: node.top,
        width: node.width,
        height: node.height,
        fontSize: node.fontSize,
        lineHeight: `${node.height}px`,
      }}
    >
      <span
        data-match={matchValue}
        className="block truncate data-[match=true]:text-[#f17676] group-hover:text-[#f17676] group-focus-visible:text-[#f17676] motion-safe:transition-colors motion-safe:duration-150"
      >
        {node.name}
      </span>
      {/* Tooltip (name + time received); not from a Figma frame, styled with the site tokens. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center rounded-lg border border-home-border bg-[#00070c] px-3 py-1.5 text-xs leading-4 font-bold whitespace-nowrap text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity motion-safe:duration-150 ${below ? "top-full mt-1" : "bottom-full mb-1"}`}
      >
        <span>{node.name}</span>
        <span className="font-medium text-white/70">{node.timeLabel}</span>
      </span>
    </Link>
  );
}
