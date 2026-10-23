import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/messages/vi";
import { AdminFooter } from "./admin-footer";
import { AdminHeader } from "./admin-header";

/*
 * Page frame of every /admin screen (Figma 773:26403, 1440 wide): header 88, then a 1280 column (x 80 to 1360, so 80px side padding
 * at 1440) that starts 24px under the header, then the footer. Page grey #999 is measured from the png. 82px between table and
 * footer in the design: `pb-[82px]` from md up. `overflow-x-clip` (not a scroller, so the sticky header still sticks) is a second
 * guard against sideways page scroll on a phone; the table scrolls inside its own box.
 */
export function AdminShell({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-[#999] font-montserrat text-login-bg">
      <AdminHeader locale={locale} dict={dict} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pt-6 pb-10 md:px-12 md:pb-[82px] xl:px-20">
        {children}
      </main>
      <AdminFooter copyright={dict.shell.footer.copyright} />
    </div>
  );
}
