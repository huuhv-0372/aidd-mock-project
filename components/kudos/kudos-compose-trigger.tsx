"use client";

import Image from "next/image";
import { useKudosComposer } from "@/components/kudos-compose/kudos-composer-provider";
import type { SearchSunnersResult } from "@/components/kudos-compose/write-kudo-types";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { ProfileSearchBox, type ProfileSearchCopy } from "./profile-search-box";

export type KudosComposeCopy = ProfileSearchCopy & { placeholder: string };

const PILL =
  "flex min-h-14 w-full items-center gap-4 rounded-[68px] border border-home-border bg-[rgb(255_234_158/0.1)] px-4 py-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white md:min-h-[72px] md:py-[23px]";

type Props = { copy: KudosComposeCopy; searchProfiles: (query: string) => Promise<SearchSunnersResult> };

/*
 * Figma "Button chuc nang" (2940:13448): the compose pill A.1 (738px) and the profile search pill (381px), 32px apart.
 * A.1 opens the write modal (page-level KudosComposerProvider); the search pill is the ProfileSearchBox combobox
 * (type-ahead of Sunners, a pick opens /profile/{id}).
 */
export function KudosComposeTrigger({ copy, searchProfiles }: Props) {
  const { openComposer } = useKudosComposer();
  return (
    // mm:2940:13448
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-8">
      {/* mm:2940:13449 */}
      <button
        type="button"
        onClick={() => openComposer()}
        data-testid="kudos-compose-trigger"
        className={`${PILL} lg:flex-[738_1_738px] ${FOCUS_RING}`}
      >
        {/* mm:I2940:13449;186:2759 */}
        <Image src="/images/kudos/icon-pen.svg" alt="" width={24} height={24} className="shrink-0" />
        {/* mm:I2940:13449;186:2760 */}
        <span className="min-w-0 flex-1 truncate">{copy.placeholder}</span>
      </button>
      <ProfileSearchBox copy={copy} searchProfiles={searchProfiles} />
    </div>
  );
}
