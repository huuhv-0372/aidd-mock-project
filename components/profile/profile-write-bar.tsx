"use client";

import Image from "next/image";
import { useKudosComposer } from "@/components/kudos-compose/kudos-composer-provider";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";

/*
 * Write bar of the other-Sunner frame (owner image of 362:5097, no MoMorph node): a 680x72 pill, pencil icon and centred text, in
 * the style family of the board's compose pill (kudos-compose-trigger.tsx: 68px radius, home-border outline, 10% gold tint). A click
 * opens Viết Kudo with this Sunner already in the recipient box (still editable, no suggestion list). `label` is the whole sentence,
 * name included, and is the button's accessible name.
 */
export function ProfileWriteBar({ recipient, label }: { recipient: { id: string; name: string }; label: string }) {
  const { openComposer } = useKudosComposer();
  return (
    <button
      type="button"
      data-testid="profile-write-bar"
      onClick={() => openComposer({ recipient })}
      className={`flex min-h-14 w-full cursor-pointer items-center justify-center gap-4 rounded-[68px] border border-home-border bg-[rgb(255_234_158/0.1)] px-4 py-4 text-center text-base leading-6 font-bold tracking-[0.15px] text-white hover:bg-[rgb(255_234_158/0.2)] md:min-h-[72px] md:py-[23px] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
    >
      <Image src="/images/kudos/icon-pen.svg" alt="" width={24} height={24} className="shrink-0" />
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}
