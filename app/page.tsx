import { cookies } from "next/headers";
import { CountdownScreen } from "./countdown/countdown-screen";
import { computeTimeLeft, parseTarget } from "./countdown/countdown-time";

const SUPPORTED_LOCALES = ["vi", "en"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function resolveLocale(raw: string | undefined): SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw ?? "")
    ? (raw as SupportedLocale)
    : "vi";
}

export default async function Home() {
  // Load-bearing: cookies() keeps this route dynamic, so
  // NEXT_PUBLIC_EVENT_START_AT below is read live on every request rather
  // than inlined at build time. Don't remove it without re-checking that.
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);
  const targetIso = process.env.NEXT_PUBLIC_EVENT_START_AT ?? "";
  const targetMs = parseTarget(targetIso);
  const initialTimeLeft = computeTimeLeft(targetMs);

  return (
    <CountdownScreen
      targetMs={targetMs}
      initialTimeLeft={initialTimeLeft}
      locale={locale}
    />
  );
}
