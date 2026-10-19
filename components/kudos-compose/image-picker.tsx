"use client";

import Image from "next/image";
import { useRef, type ChangeEvent } from "react";
import { CloseTinyIcon, PlusIcon } from "./compose-icons";
import { FieldLabel } from "./compose-field-label";
import { ERROR_FLOAT, FOCUS, REMOVE_BUTTON, REMOVE_DOT } from "./compose-field-styles";
import type { AttachedImage } from "./use-image-attachments";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { KUDO_LIMITS } from "./write-kudo-types";

type Props = {
  copy: WriteKudoCopy["image"];
  images: AttachedImage[];
  error: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
};

/*
 * Image (Figma F / F.1-F.5, mm:520:9896): thumbnails (80px, red x at the corner) + "+ Image" (hidden once 5 are
 * attached). The file input stays in the DOM at all times; "+ Image" just opens it.
 */
export function ImagePicker({ copy, images, error, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // lets the same file be picked again after it was removed
    if (files.length) onAdd(files);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      {/* mm:I520:11647;520:9897 */}
      <FieldLabel className="sm:min-w-[74px]">{copy.label}</FieldLabel>
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-4">
          {images.map((image, index) => (
            // mm:I520:11647;662:9197
            <div key={image.id} data-testid="image-thumb" className="relative size-20 shrink-0 rounded-[18px] border border-home-border bg-white">
              {/* mm:I520:11647;662:9197;256:4717 (object URL: next/image serves it as-is) */}
              <Image
                src={image.url}
                alt=""
                width={80}
                height={80}
                sizes="80px"
                unoptimized
                className="absolute inset-0 size-full rounded border border-login-accent object-cover"
              />
              {/* mm:I520:11647;662:9197;662:9287 */}
              <button
                type="button"
                aria-label={`${copy.remove} ${index + 1}`}
                onClick={() => onRemove(image.id)}
                className={`${REMOVE_BUTTON} absolute -top-5 -right-5`}
              >
                <span className={REMOVE_DOT}>
                  <CloseTinyIcon />
                </span>
              </button>
            </div>
          ))}
          {images.length < KUDO_LIMITS.imagesMax && (
            // mm:I520:11647;662:9133
            <button
              type="button"
              aria-label={copy.add}
              onClick={() => inputRef.current?.click()}
              className={`flex min-h-12 min-w-11 cursor-pointer items-center gap-1 rounded-lg border border-home-border bg-white px-[7px] py-1 text-left hover:bg-[#fffdf3] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS}`}
            >
              <span className="text-home-border">
                <PlusIcon />
              </span>
              <span className="flex flex-col">
                <span className="text-base leading-[22px] font-bold tracking-[0.15px] text-login-bg">{copy.label}</span>
                <span className="text-[11px] leading-4 font-bold tracking-[0.5px] text-kudos-muted">{copy.max}</span>
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={KUDO_LIMITS.imageTypes.join(",")}
            data-testid="kudo-image-input"
            tabIndex={-1}
            onChange={onChange}
            className="hidden"
          />
        </div>
        {error && (
          <p data-testid="error-images" className={ERROR_FLOAT}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
