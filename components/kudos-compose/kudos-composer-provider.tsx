"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useStatusToast } from "@/components/ui/status-toast";
import type { Locale } from "@/lib/i18n/locales";
import { createKudo } from "@/lib/kudos/create-kudo-action";
import { getHashtagOptions } from "@/lib/kudos/get-hashtag-options-action";
import { kudoEditorJsonToMarkdown, type KudoEditorNode } from "@/lib/kudos/kudo-content-markdown";
import type { KudoRow } from "@/lib/kudos/kudo-types";
import { searchSunners } from "@/lib/kudos/search-sunners-action";
import { updateKudo } from "@/lib/kudos/update-kudo-action";
import { getInitialRecipient, type ComposerOptions } from "./normalize-composer-options";
import { KudosRulesDialog, type KudosRulesDialogCopy } from "./kudos-rules-dialog";
import type { WriteKudoCopy } from "./write-kudo-copy";
import { toEditableKudo } from "./to-editable-kudo";
import type { EditableKudo, RecipientChoice, WriteKudoActions } from "./write-kudo-types";

// The editor (Tiptap) is heavy and only needed after the first open: load it on demand, never on the server.
const WriteKudoDialog = dynamic(() => import("./write-kudo-dialog"), { ssr: false });

const ACTIONS: WriteKudoActions = { searchSunners, getHashtagOptions, createKudo, updateKudo };
const serializeContent = (doc: unknown) => kudoEditorJsonToMarkdown(doc as KudoEditorNode);

type KudosComposerContextValue = {
  /**
   * Opens the write modal, optionally with the recipient already chosen (a guest is sent to the login page instead,
   * see `setGuestWriteHref`). Without options the form starts empty.
   */
  openComposer: (options?: ComposerOptions) => void;
  /** Opens the same modal in edit mode, pre-filled from a Kudo the viewer sent. After a save the card shows the new row (see `savedKudos`). */
  openEditor: (kudo: KudoRow) => void;
  /** Kudos saved from the edit modal, by id: a feed shows these in place of the row it was rendered with. */
  savedKudos: ReadonlyMap<string, KudoRow>;
  /** Accessible name of the pencil on a card (the card copy lives with the board, this one with the modal). */
  editLabel: string;
  openRules: () => void;
  /** The widget reports the login link a guest must follow to write a Kudo (null when signed in). */
  setGuestWriteHref: (href: string | null) => void;
};

const KudosComposerContext = createContext<KudosComposerContextValue | null>(null);

export function useKudosComposer(): KudosComposerContextValue {
  const context = useContext(KudosComposerContext);
  if (!context) throw new Error("useKudosComposer must be used inside <KudosComposerProvider>");
  return context;
}

export type KudosComposerCopy = { rulesDialog: KudosRulesDialogCopy; write: WriteKudoCopy };

/*
 * Page-level state of the two Kudos overlays: the Thể lệ panel and the Viết Kudo modal. The rules text is rendered on
 * the server (`rulesContent`) and passed through; the modal is mounted only after its first open. A sent Kudo closes
 * the modal and refreshes the route so the board shows it. The same modal opens in edit mode from the pencil of a
 * card (`openEditor`); a saved row is kept by id so the feed changes that card in place.
 */
export function KudosComposerProvider({
  locale,
  copy,
  rulesContent,
  children,
}: {
  locale: Locale;
  copy: KudosComposerCopy;
  rulesContent: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMounted, setComposerMounted] = useState(false);
  const [initialRecipient, setInitialRecipient] = useState<RecipientChoice | null>(null);
  const [editing, setEditing] = useState<EditableKudo | null>(null);
  const [savedKudos, setSavedKudos] = useState<ReadonlyMap<string, KudoRow>>(() => new Map());
  const guestWriteHref = useRef<string | null>(null);
  const { show: showToast, toast } = useStatusToast();

  const openRules = useCallback(() => setRulesOpen(true), []);
  const setGuestWriteHref = useCallback((href: string | null) => {
    guestWriteHref.current = href;
  }, []);
  const openComposer = useCallback((options?: ComposerOptions) => {
    if (guestWriteHref.current) {
      router.push(guestWriteHref.current);
      return;
    }
    setInitialRecipient(getInitialRecipient(options));
    setEditing(null);
    setComposerMounted(true);
    setComposerOpen(true);
  }, [router]);
  const openEditor = useCallback((kudo: KudoRow) => {
    setEditing(toEditableKudo(kudo));
    setComposerMounted(true);
    setComposerOpen(true);
  }, []);

  const editLabel = copy.write.edit.pencil;
  const value = useMemo(
    () => ({ openComposer, openEditor, savedKudos, editLabel, openRules, setGuestWriteHref }),
    [openComposer, openEditor, savedKudos, editLabel, openRules, setGuestWriteHref],
  );

  return (
    <KudosComposerContext.Provider value={value}>
      {children}
      <KudosRulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} onWriteKudo={() => openComposer()} copy={copy.rulesDialog}>
        {rulesContent}
      </KudosRulesDialog>
      {composerMounted && (
        <WriteKudoDialog
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSent={() => {
            setComposerOpen(false);
            showToast(copy.write.success.sent);
            router.refresh();
          }}
          locale={locale}
          initialRecipient={initialRecipient}
          copy={copy.write}
          actions={ACTIONS}
          serializeContent={serializeContent}
          initialKudo={editing}
          onSaved={(kudo) => {
            setSavedKudos((previous) => new Map(previous).set(kudo.id, kudo));
            setComposerOpen(false);
            showToast(copy.write.success.saved);
            router.refresh();
          }}
        />
      )}
      {toast}
    </KudosComposerContext.Provider>
  );
}
