"use client";

import { useId } from "react";
import Image from "next/image";
import type { SearchSunnersResult } from "@/components/kudos-compose/write-kudo-types";
import { ProfileSearchResults, profileOptionId } from "./profile-search-results";
import { useProfileSearch } from "./use-profile-search";

export type ProfileSearchCopy = { searchPlaceholder: string; searchSubmitLabel: string; searchListLabel: string; searchNoResult: string; searchError: string };

type Props = { copy: ProfileSearchCopy; searchProfiles: (query: string) => Promise<SearchSunnersResult> };

// Figma 2940:13450: 381x72 pill, 1px #998C5F border, rgba(255,234,158,0.10) fill, radius 68, padding 24/16, 16px between icon and text (same pill as A.1).
// `has-[:focus-visible]` draws the focus ring on the pill, since the input itself has no outline.
const PILL =
  "flex min-h-14 w-full items-center gap-4 rounded-[68px] border border-home-border bg-[rgb(255_234_158/0.1)] px-4 py-0 text-base leading-6 font-bold tracking-[0.15px] text-white outline-offset-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-login-accent md:min-h-[72px]";

/*
 * Tìm kiếm profile Sunner (mm:2940:13450): the pill is a search form. The magnifier (mm:I2940:13450;186:2759) is the submit
 * button (44x44 hit area, the 24px icon keeps its Figma position through negative margins); the label text
 * (mm:I2940:13450;186:2760) is the input placeholder. The dropdown hangs under the form, as wide as the pill.
 */
export function ProfileSearchBox({ copy, searchProfiles }: Props) {
  const listId = useId();
  const search = useProfileSearch(searchProfiles);
  const statusText = search.status === "empty" ? copy.searchNoResult : search.status === "error" ? copy.searchError : "";
  return (
    // mm:2940:13450
    <form role="search" data-testid="profile-search" onSubmit={search.onSubmit} className="relative w-full lg:flex-[381_1_381px]">
      <div className={PILL}>
        {/* mm:I2940:13450;186:2759 */}
        <button
          type="submit"
          aria-label={copy.searchSubmitLabel}
          onMouseDown={(event) => event.preventDefault()}
          className="-m-2.5 flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-white/10 motion-safe:transition-colors motion-safe:duration-200"
        >
          <Image src="/images/kudos/icon-search.svg" alt="" width={24} height={24} />
        </button>
        {/* mm:I2940:13450;186:2760 */}
        <input
          type="text"
          role="combobox"
          autoComplete="off"
          maxLength={100}
          value={search.text}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchPlaceholder}
          aria-expanded={search.open}
          aria-controls={search.open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={search.open && search.active >= 0 ? profileOptionId(listId, search.active) : undefined}
          onChange={search.onChange}
          onKeyDown={search.onKeyDown}
          onBlur={search.onBlur}
          className="min-w-0 flex-1 self-stretch truncate bg-transparent py-4 text-base leading-6 font-bold tracking-[0.15px] text-white outline-none placeholder:text-white md:py-[23px]"
        />
      </div>
      <ProfileSearchResults
        listId={listId}
        listLabel={copy.searchListLabel}
        items={search.items}
        open={search.open}
        active={search.active}
        statusText={statusText}
        onHover={search.setActive}
        onPick={search.go}
      />
    </form>
  );
}
