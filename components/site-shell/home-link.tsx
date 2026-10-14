"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { HOME_PATH } from "@/lib/navigation/routes";

/*
 * next/link to the page we are already on does not scroll (no segment changes and the sticky
 * header is in view), so a home link clicked from a scrolled position scrolls to the top itself.
 */
export function HomeLink({ onClick, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link
      {...props}
      href={HOME_PATH}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || pathname !== HOME_PATH) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
      }}
    />
  );
}
