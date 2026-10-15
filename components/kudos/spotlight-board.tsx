"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { centerOn, INITIAL_PAN_ZOOM, panBy, wheelScaleFactor, zoomAt, type PanZoom, type Size } from "@/lib/kudos/pan-zoom";
import { SpotlightBoardBackdrop } from "./spotlight-board-backdrop";
import { SpotlightNode, type SpotlightNodeData } from "./spotlight-node";
import { SpotlightSearch } from "./spotlight-search";

export type SpotlightBoardCopy = {
  title: string;
  unit: string;
  searchLabel: string;
  panZoomLabel: string;
  noResults: string;
};

type SpotlightBoardProps = {
  /** `null` = the data block failed to load: the total is hidden and `message` explains. */
  total: number | null;
  nodes: SpotlightNodeData[];
  canvas: Size;
  copy: SpotlightBoardCopy;
  /** Empty/error text centred in the frame when there are no nodes. */
  message?: string;
  /** Server-rendered ticker overlay (bottom-left). */
  ticker: ReactNode;
};

/** Below this many pixels of pointer travel a press is still a click on a node. */
const DRAG_THRESHOLD = 4;

/** Accent- and case-insensitive key so "huynh" finds "Huỳnh". */
const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").replace(/\u0111/gi, "d").toLowerCase();

type DragState = { id: number; x: number; y: number; active: boolean };

/* Figma B.7 `2940:14174`: 1157x548 frame, 47.14px radius, 1px #998C5F border. */
export function SpotlightBoard({ total, nodes, canvas, copy, message, ticker }: SpotlightBoardProps) {
  const [view, setView] = useState<PanZoom>(INITIAL_PAN_ZOOM);
  const [panZoomOn, setPanZoomOn] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  const content = useMemo<Size>(() => ({ width: canvas.width, height: canvas.height }), [canvas.width, canvas.height]);
  const needle = fold(query.trim());
  const matches = nodes.map((node) => needle !== "" && fold(node.name).includes(needle));
  const hasMatch = matches.includes(true);

  const viewportSize = (): Size => viewportRef.current?.getBoundingClientRect() ?? content;

  const bringIntoView = (node: SpotlightNodeData) => {
    const size = viewportSize();
    setView((v) => centerOn(v, { x: node.left + node.width / 2, y: node.top + node.height / 2 }, size, content));
  };

  // Wheel zoom needs a non-passive listener (React's onWheel cannot preventDefault); only while
  // Pan/Zoom is on, so with it off the wheel scrolls the page as usual.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !panZoomOn) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setView((v) => zoomAt(v, v.scale * wheelScaleFactor(event.deltaY), anchor, rect, content));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panZoomOn, content]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!panZoomOn || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    suppressClick.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      // Capture only once it is a real drag, so a plain click still reaches the node link.
      state.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    state.x = event.clientX;
    state.y = event.clientY;
    const size = viewportSize();
    setView((v) => panBy(v, dx, dy, size, content));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    if (state.active) {
      suppressClick.current = true;
      setDragging(false);
    }
    drag.current = null;
  };

  return (
    <div
      data-testid="spotlight-board"
      className="relative isolate h-[420px] w-full max-w-[1157px] overflow-clip rounded-[47.14px] border border-home-border bg-login-bg font-montserrat md:h-[548px]"
    >
      <SpotlightBoardBackdrop />
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        className={`absolute inset-0 overflow-clip ${panZoomOn ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      >
        <div
          className={`absolute top-0 left-0 origin-top-left ${dragging ? "" : "motion-safe:transition-transform motion-safe:duration-300 motion-reduce:transition-none"}`}
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          {nodes.map((node, index) => (
            <SpotlightNode
              key={node.id}
              node={node}
              match={matches[index]}
              onKeyboardFocus={() => bringIntoView(node)}
            />
          ))}
        </div>
      </div>

      {message && nodes.length === 0 ? (
        <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-base font-medium text-white/80">
          {message}
        </p>
      ) : null}

      {total === null ? null : (
        // mm:3007:17482
        <p
          data-testid="spotlight-total"
          className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 text-3xl leading-[44px] font-bold whitespace-nowrap text-white md:top-[14px] md:text-[36px]"
        >
          {`${total} ${copy.unit}`}
        </p>
      )}

      <SpotlightSearch
        value={query}
        onChange={setQuery}
        onSubmit={() => {
          const first = nodes.find((_, index) => matches[index]);
          if (first) bringIntoView(first);
        }}
        label={copy.searchLabel}
        statusMessage={needle !== "" && !hasMatch ? copy.noResults : ""}
      />

      {ticker}

      {/* mm:3007:17479 */}
      <button
        type="button"
        aria-pressed={panZoomOn}
        aria-label={copy.panZoomLabel}
        title={copy.panZoomLabel}
        onClick={() => setPanZoomOn((on) => !on)}
        className="absolute right-[31px] bottom-[40px] grid min-h-11 min-w-11 place-items-center rounded-full text-white outline-offset-2 hover:text-login-accent focus-visible:outline-2 focus-visible:outline-login-accent aria-pressed:text-login-accent motion-safe:transition-colors motion-safe:duration-150"
      >
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
          <path d="M19 4.5h7v7M26 5l-5.5 5.5M11 25.5H4v-7M4 26l5.5-5.5" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </button>
    </div>
  );
}
