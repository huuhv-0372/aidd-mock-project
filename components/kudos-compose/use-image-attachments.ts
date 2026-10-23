"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KUDO_LIMITS } from "./write-kudo-types";

/** One thumbnail. `file` is null for an image the Kudo already has (its `url` is the stored URL, not an object URL). */
export type AttachedImage = { id: string; file: File | null; url: string };

type Messages = { imageFormat: string; imageSize: string };

const fromUrls = (urls: readonly string[]): AttachedImage[] => urls.map((url, index) => ({ id: `kept-${index}`, file: null, url }));
const revoke = (image: AttachedImage) => image.file && URL.revokeObjectURL(image.url);

/**
 * Images of one Kudo (F): up to 5 jpg/png/webp files <= 5 MB, previewed through object URLs that are revoked on remove
 * and on unmount. Only the browser MIME type and size are checked here; the server action sniffs the real bytes.
 * Edit mode starts with the Kudo's stored `existing` URLs (in order, removable, never revoked); new files are appended,
 * so the list always reads "kept images in order, then new ones in add order" - the order the server stores.
 */
export function useImageAttachments(messages: Messages, existing: readonly string[] = []) {
  const [initial] = useState(() => fromUrls(existing));
  const [images, setImages] = useState<AttachedImage[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<AttachedImage[]>(initial);
  const counter = useRef(0);

  useEffect(() => {
    return () => current.current.forEach(revoke);
  }, []);

  const add = useCallback(
    (files: File[]) => {
      let message: string | null = null;
      const accepted: AttachedImage[] = [];
      let room = KUDO_LIMITS.imagesMax - current.current.length;
      for (const file of files) {
        if (!(KUDO_LIMITS.imageTypes as readonly string[]).includes(file.type)) message = messages.imageFormat;
        else if (file.size > KUDO_LIMITS.imageBytesMax) message = messages.imageSize;
        else if (room > 0) {
          room -= 1;
          counter.current += 1;
          accepted.push({ id: `image-${counter.current}`, file, url: URL.createObjectURL(file) });
        }
      }
      setError(message);
      if (!accepted.length) return;
      current.current = [...current.current, ...accepted];
      setImages(current.current);
    },
    [messages.imageFormat, messages.imageSize],
  );

  const remove = useCallback((id: string) => {
    const gone = current.current.find((image) => image.id === id);
    if (gone) revoke(gone);
    current.current = current.current.filter((image) => image.id !== id);
    setImages(current.current);
    setError(null);
  }, []);

  return { images, error, setError, add, remove };
}
