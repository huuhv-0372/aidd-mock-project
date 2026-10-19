import { Mention } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import type { SunnerOption, WriteKudoActions } from "./write-kudo-types";

/**
 * What the React side needs to draw the "@" list; built from Tiptap's suggestion props on every update.
 * `loading`: a search for the current query is still pending (so an empty `items` is not yet "no result").
 */
export type MentionPopup = {
  items: SunnerOption[];
  loading: boolean;
  rect: DOMRect | null;
  pick: (item: SunnerOption) => void;
};

type Hooks = {
  searchSunners: WriteKudoActions["searchSunners"];
  onPopup: (popup: MentionPopup | null) => void;
  onKey: (event: KeyboardEvent) => boolean;
};

/*
 * "@ + tên" (spec D / D.1): Tiptap's mention node fed by the same Sunner search as Người nhận, names only (never email).
 * "@" alone already lists Sunners (minQueryLength 0, empty query = first Sunners by name) and names may hold spaces
 * ("@Nguyễn Văn B"). Tiptap debounces, aborts stale queries and closes on Esc itself; the popup is drawn by
 * MentionSuggestionList inside the modal (so it stays in the dialog's top layer), which is why `render` only forwards state.
 * Output node: <span data-type="mention" data-id="{sunnerId}">@{Full name}</span>.
 */
export function createMentionExtension({ searchSunners, onPopup, onKey }: Hooks) {
  // Own key: exitSuggestion() must target this plugin (its default key is the generic "suggestion" one, which Mention does not use).
  const pluginKey = new PluginKey("kudoMention");
  return Mention.configure({
    suggestion: {
      pluginKey,
      char: "@",
      minQueryLength: 0,
      allowSpaces: true,
      debounce: 150,
      items: async ({ query, signal }): Promise<SunnerOption[]> => {
        try {
          const result = await searchSunners(query.trim(), { nameOnly: true });
          return signal.aborted || !result.ok ? [] : result.items.filter((item) => item.full_name);
        } catch (err) {
          console.error("[kudos] mention search failed", err); // shown as the no-result row; typing again retries
          return [];
        }
      },
      render: () => {
        const show = (props: SuggestionProps<SunnerOption, { id: string; label: string }>) => {
          // allowSpaces keeps the suggestion open to the end of the paragraph: once a query with a space finds nobody,
          // the user is writing plain text ("@team đã hỗ trợ…"), so drop the suggestion instead of trailing the caret.
          if (!props.loading && props.items.length === 0 && /\s/.test(props.query)) {
            exitSuggestion(props.editor.view, pluginKey);
            onPopup(null);
            return;
          }
          onPopup({
            items: props.items,
            loading: props.loading,
            rect: props.clientRect?.() ?? null,
            pick: (item) => props.command({ id: item.id, label: item.full_name ?? "" }),
          });
        };
        return { onStart: show, onUpdate: show, onKeyDown: ({ event }) => onKey(event), onExit: () => onPopup(null) };
      },
    },
  });
}
