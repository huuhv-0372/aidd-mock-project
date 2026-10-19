import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/messages/vi";
import { KudosComposerProvider } from "./kudos-composer-provider";
import { KudosRulesContent } from "./kudos-rules-content";

/**
 * Server wrapper used by the three pages that carry the floating widget: renders the rules text on the server and
 * hands it, with the dialog copy, to the client provider that owns the overlays.
 */
export function KudosComposer({ locale, copy, children }: { locale: Locale; copy: Dictionary["kudosCompose"]; children: ReactNode }) {
  return (
    <KudosComposerProvider
      locale={locale}
      copy={{ rulesDialog: copy.rulesDialog, write: copy.write }}
      rulesContent={<KudosRulesContent copy={copy.rules} />}
    >
      {children}
    </KudosComposerProvider>
  );
}
