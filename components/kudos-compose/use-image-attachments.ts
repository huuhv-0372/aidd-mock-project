"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KUDO_LIMITS } from "./write-kudo-types";

export type AttachedImage = { id: string; file: File; url: string };

type Messages = { imageFormat: string; imageSize: string };

/**
 * Images of one Kudo (F): up to 5 jpg/png/webp files <= 5 MB, previewed through object URLs that are revoked on remove
 * and on unmount. Only the browser MIME type and size are checked here; the server action sniffs the real bytes.
 */
export function useImageAttachments(messages: Messages) {
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<AttachedImage[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return () => current.current.forEach((image) => URL.revokeObjectURL(image.url));
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
    if (gone) URL.revokeObjectURL(gone.url);
    current.current = current.current.filter((image) => image.id !== id);
    setImages(current.current);
    setError(null);
  }, []);

  return { images, error, setError, add, remove };
}
