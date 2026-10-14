import Link from "next/link";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { GUEST_CONTROL_WIDTH } from "./shell-class-names";

/*
 * Guest header control (no Figma frame): same visual language as the profile button next to it,
 * i.e. 40px (44px below lg) tall, #998C5F 1px border, 4px radius, white label in the header-control
 * type style (16/24 bold, 0.15px), white-tint hover, white focus ring.
 */
export function LoginLink() {
  return (
    <Link
      href={LOGIN_PATH}
      className={`order-3 flex h-11 ${GUEST_CONTROL_WIDTH} shrink-0 items-center justify-center rounded border border-home-border text-base leading-6 font-bold tracking-[0.15px] whitespace-nowrap text-white outline-offset-0 outline-white hover:bg-white/10 focus-visible:outline-2 lg:h-10 motion-safe:transition-colors motion-safe:duration-200`}
    >
      Đăng nhập
    </Link>
  );
}
