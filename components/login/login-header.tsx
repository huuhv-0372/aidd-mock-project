import Image from "next/image";
import { LanguageSelector } from "./language-selector";

export function LoginHeader() {
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
            alt="Sun* Annual Awards 2025"
            width={52}
            height={48}
            sizes="52px"
            preload
          />
        </div>
        {/* mm:I662:14391;186:1601 */}
        <LanguageSelector />
      </div>
    </header>
  );
}
