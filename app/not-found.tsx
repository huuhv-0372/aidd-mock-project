import Link from "next/link";
import type { Metadata } from "next";
import { FOCUS_RING } from "@/components/site-shell/shell-class-names";
import { HOME_PATH } from "@/lib/navigation/routes";

export const metadata: Metadata = {
  title: "Không tìm thấy trang | SAA 2025",
};

/* Shared by every route that does not exist (or is not built yet), so no header/footer and no error details. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-login-bg px-4 py-12 text-center font-montserrat">
      <h1 className="text-3xl leading-10 font-bold text-white md:text-5xl md:leading-[3.5rem]">Không tìm thấy trang</h1>
      <p className="max-w-md text-base leading-6 text-white/80">
        Trang bạn tìm không tồn tại hoặc đã được chuyển đi nơi khác.
      </p>
      <Link
        href={HOME_PATH}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded bg-login-accent px-6 py-3 text-base leading-6 font-bold text-login-bg hover:bg-[#fff3c4] motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_RING}`}
      >
        Về trang chủ
      </Link>
    </main>
  );
}
