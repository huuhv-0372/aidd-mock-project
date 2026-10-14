import Image from "next/image";
import { LanguageSelector } from "@/components/ui/language-selector";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/messages/vi";

export function LoginHeader({ locale, copy }: { locale: Locale; copy: Dictionary["shell"] }) {
  return (
    // mm:662:14391
    <header className="sticky top-0 z-20 w-full bg-login-header-bg">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-4 py-3 md:px-12 lg:px-36">
        {/* mm:I662:14391;186:2166 */}
        <div className="flex h-14 items-center">
          {/* mm:I662:14391;178:1033 */}
          {/* mm:I662:14391;178:1033;178:1030 */}
          <Image
            src="/images/login/logo.png"
            alt={copy.logoAlt}
            width={52}
            height={48}
            sizes="52px"
            preload
          />
        </div>
        {/* mm:I662:14391;186:1601 */}
        <LanguageSelector locale={locale} listLabel={copy.languageListLabel} />
      </div>
    </header>
  );
}
