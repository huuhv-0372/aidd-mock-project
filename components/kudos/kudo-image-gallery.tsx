"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";

export type KudoImageGalleryCopy = {
  /** Thumbnail button name template, `{index}` and `{total}` are replaced: "Xem ảnh {index}/{total}". */
  openImage: string; // not from Figma
  /** Alt text of an attached image. */
  imageAlt: string; // not from Figma
  closeImage: string; // not from Figma
};

const MAX_IMAGES = 5;

/* Large view of one attached image. A native modal <dialog>: Esc closes it, a click on the backdrop closes it. */
function ImageLightbox({ src, alt, closeLabel, onClose }: { src: string; alt: string; closeLabel: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={alt}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto max-h-[90vh] max-w-[90vw] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
    >
      <Image
        src={src}
        alt={alt}
        width={960}
        height={960}
        sizes="90vw"
        unoptimized
        className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
      />
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => dialogRef.current?.close()}
        className={`absolute top-2 right-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-2xl leading-none font-bold text-white hover:bg-black/80 motion-safe:transition-colors ${FOCUS_RING}`}
      >
        <span aria-hidden>×</span>
      </button>
    </dialog>
  );
}

/*
 * Attached images of a feed card (Figma C.3.6, `256:5176`): up to 5 square 88px thumbnails, 16px apart.
 * `plain` (View Kudo, Figma 520:18779): only the thin accent ring with a small radius, no outer white frame.
 * Clicking one opens the large view; closing it returns focus to the thumbnail that opened it.
 */
export function KudoImageGallery({
  images,
  copy,
  plain = false,
}: {
  images: readonly string[];
  copy: KudoImageGalleryCopy;
  plain?: boolean;
}) {
  const shown = images.slice(0, MAX_IMAGES);
  const [active, setActive] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  if (shown.length === 0) return null;

  function close() {
    const index = active;
    setActive(null);
    if (index !== null) triggers.current[index]?.focus();
  }

  return (
    // mm:I3127:21871;256:5176
    <div className="flex flex-wrap items-center gap-4">
      {shown.map((src, index) => (
        // mm:I3127:21871;256:5177
        <button
          key={src}
          ref={(node) => {
            triggers.current[index] = node;
          }}
          type="button"
          data-testid="kudo-image"
          aria-label={copy.openImage.replace("{index}", String(index + 1)).replace("{total}", String(shown.length))}
          onClick={() => setActive(index)}
          className={`relative size-[88px] shrink-0 cursor-pointer overflow-hidden ${plain ? "rounded" : "rounded-[18px] border border-home-border bg-white"} ${FOCUS_RING}`}
        >
          {/* mm:I3127:21871;256:5177;513:8436 */}
          <Image src={src} alt="" fill sizes="88px" unoptimized className="rounded border border-login-accent object-cover" />
        </button>
      ))}
      {active !== null && <ImageLightbox src={shown[active]} alt={copy.imageAlt} closeLabel={copy.closeImage} onClose={close} />}
    </div>
  );
}
