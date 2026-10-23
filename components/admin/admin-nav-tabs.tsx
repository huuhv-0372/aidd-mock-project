import Link from "next/link";
import { FOCUS_RING, GLOW_ON_HOVER, GLOW_WHEN_CURRENT } from "@/components/site-shell/shell-class-names";
import { ADMIN_USERS_PATH } from "@/lib/navigation/routes";
import type { Dictionary } from "@/messages/vi";

const TAB =
  "flex min-h-11 items-center rounded border-b border-transparent px-2 text-sm leading-5 font-medium tracking-[0.1px] text-white lg:p-4";
const TAB_LINK = `${TAB} hover:bg-[rgb(255_234_158/0.1)] ${GLOW_ON_HOVER} aria-[current=page]:border-login-accent aria-[current=page]:text-login-accent ${GLOW_WHEN_CURRENT} motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`;
/* Overview / Review content / Settings are not built yet: shown (Figma: white, same Medium weight as the active tab) but inert. A bare <span>, so no link role and no href. */
const TAB_DISABLED = `${TAB} cursor-not-allowed`;

const TABS = ["overview", "review", "user", "settings"] as const;

/* The four admin tabs of Figma 773:26405. Only User exists and is the current page; the others are aria-disabled. */
export function AdminNavTabs({ copy }: { copy: Dictionary["admin"]["header"] }) {
  return (
    // mm:773:26405 (tabs)
    <nav
      aria-label={copy.navAriaLabel}
      className="order-3 flex w-full flex-wrap justify-center gap-1 lg:order-2 lg:w-auto lg:justify-start lg:gap-6 xl:gap-12"
    >
      {TABS.map((key) =>
        key === "user" ? (
          <Link key={key} href={ADMIN_USERS_PATH} data-testid={`admin-tab-${key}`} aria-current="page" className={TAB_LINK}>
            {copy.tabs[key]}
          </Link>
        ) : (
          <span key={key} data-testid={`admin-tab-${key}`} aria-disabled="true" className={TAB_DISABLED}>
            {copy.tabs[key]}
          </span>
        ),
      )}
    </nav>
  );
}
