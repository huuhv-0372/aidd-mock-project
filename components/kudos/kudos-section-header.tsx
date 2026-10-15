import type { ReactNode } from "react";

/*
 * Section header shared by Highlight (B.1), Spotlight (B.6) and All Kudos (C.1): eyebrow line, 1px divider,
 * then the gold section title with an optional right-hand slot (filter buttons). Sits inside the page column.
 */
export function KudosSectionHeader({
  eyebrow,
  title,
  titleId,
  children,
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  children?: ReactNode;
}) {
  return (
    // mm:2940:13453
    <header className="flex w-full flex-col gap-4">
      {/* mm:2940:13454 */}
      <p className="text-xl leading-8 font-bold text-white md:text-2xl">{eyebrow}</p>
      {/* mm:2940:13455 */}
      <div className="h-px w-full bg-login-divider" />
      {/* mm:2940:13456 */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        {/* mm:2940:13457 */}
        <h2
          id={titleId}
          className="text-4xl leading-[1.12] font-bold tracking-[-0.25px] text-login-accent md:text-[57px] md:leading-16"
        >
          {title}
        </h2>
        {children}
      </div>
    </header>
  );
}
