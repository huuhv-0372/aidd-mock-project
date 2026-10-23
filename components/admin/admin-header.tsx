import Image from "next/image";
import { HomeLink } from "@/components/site-shell/home-link";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { SignedInControls } from "@/components/site-shell/signed-in-controls";
import { SignOutForm } from "@/components/site-shell/sign-out-form";
import { LanguageSelector } from "@/components/ui/language-selector";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/messages/vi";
import { AdminNavTabs } from "./admin-nav-tabs";

/*
 * Admin header (Figma 773:26405, 1440 x 88, solid #2B2F31 measured from the png): logo + divider + yellow "Admin" on the left, four
 * tabs in the middle, bell / language / account on the right. Same 144px side padding as the public header at xl, and
 * space-between spreads the three groups (the png shows two equal 108px gaps). Below lg the tabs drop to their own row.
 * The account menu is the shared one: the viewer is an admin here, so it always carries Dashboard.
 */
export function AdminHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { shell, admin } = dict;
  return (
    // mm:773:26405
    <header data-testid="admin-header" className="relative z-30 w-full bg-[#2b2f31] font-montserrat lg:sticky lg:top-0">
      <div className="mx-auto flex w-full max-w-[1512px] flex-wrap items-center justify-between gap-x-4 px-4 py-3 md:px-12 lg:flex-nowrap xl:px-36">
        <div className="order-1 flex items-center gap-1">
          <HomeLink className={`flex h-16 shrink-0 items-center rounded ${FOCUS_RING}`}>
            <Image src="/images/home/logo-footer.png" alt={shell.logoAlt} width={69} height={64} sizes="69px" />
          </HomeLink>
          <span aria-hidden="true" className="h-8 w-px bg-[#999]" />
          <span data-testid="admin-header-label" className="px-1 text-base leading-6 font-medium text-login-accent">
            {admin.header.label}
          </span>
        </div>
        <AdminNavTabs copy={admin.header} />
        <div className="order-2 ml-auto flex items-center gap-1 lg:order-3 lg:ml-0 lg:gap-4">
          <div className="order-2">
            <LanguageSelector locale={locale} listLabel={shell.languageListLabel} />
          </div>
          <SignedInControls copy={shell} signOutSlot={<SignOutForm label={shell.account.signOut} />} isAdmin />
        </div>
      </div>
    </header>
  );
}
