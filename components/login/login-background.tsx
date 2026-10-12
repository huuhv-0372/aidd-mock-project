import Image from "next/image";

/*
 * Full-bleed key visual + the two gradient overlays (Figma 1440x1024 artboard).
 * The page root must be `relative isolate`; this layer sits behind everything.
 * login-background.jpg = countdown-background.png with its alpha channel dropped (the PNG is
 * max 50% opaque, which rendered the art far dimmer than the frame); real Figma export unavailable.
 */
export function LoginBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-login-bg"
    >
      {/* mm:662:14388 */}
      {/* mm:662:14389 */}
      {/* Below lg: cover the viewport. lg+: crop fitted to the frame (181% x 181%, offset -27.8% / -62.5%). */}
      <div className="absolute top-0 left-0 h-full w-full lg:-top-[62.5%] lg:-left-[27.78%] lg:h-[181.25%] lg:w-[181%]">
        <Image
          src="/images/login/login-background.jpg"
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) 160vw, 100vw"
          className="object-cover object-right lg:object-fill"
        />
      </div>
      {/* mobile/tablet readability scrim (text sits over the artwork) */}
      <div className="absolute inset-0 bg-login-bg/60 lg:hidden" />
      {/* mm:662:14392 */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#00101a_0%,#00101a_25.41%,rgba(0,16,26,0)_100%)]" />
      {/* mm:662:14390 */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,#00101a_3.8%,rgba(0,19,32,0)_35.06%)]" />
    </div>
  );
}
