import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { SearchSunnersResult, SunnerOption } from "@/components/kudos-compose/write-kudo-types";
import { profileHref } from "@/lib/navigation/routes";

const SEARCH_DELAY_MS = 150;

/** What the status row says: nothing, "no Sunner found", or the generic search error. */
export type ProfileSearchStatus = "idle" | "empty" | "error";

/**
 * Tìm kiếm profile Sunner (Live board pill 2940:13450): debounce 150 ms -> `searchProfiles(trimmed)` -> up to 10 rows;
 * a pick, Enter or the magnifier opens /profile/{id}. Not shared with the Write Kudo recipient picker on purpose: that one
 * fills text and knows "@" / onTypedChange, this one navigates.
 * `latest` is bumped by every keystroke, pick and blur, so an older answer arriving late (or after focus left) is dropped.
 */
export function useProfileSearch(searchProfiles: (query: string) => Promise<SearchSunnersResult>) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [items, setItems] = useState<SunnerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProfileSearchStatus>("idle");
  const [active, setActive] = useState(-1);
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Cancels a search still in its debounce or in flight; returns this run's ticket. */
  function supersede() {
    clearTimeout(timer.current);
    latest.current += 1;
    return latest.current;
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    const query = next.trim();
    const mine = supersede();
    setText(next);
    setItems([]);
    setActive(-1);
    setOpen(false);
    setStatus("idle");
    if (!query) return; // blank: no request, no error
    timer.current = setTimeout(async () => {
      let result: SearchSunnersResult;
      try {
        result = await searchProfiles(query);
      } catch (err) {
        console.error("[kudos] profile search failed", err); // the page only shows the generic line; typing again retries
        result = { ok: false };
      }
      if (mine !== latest.current) return; // a newer keystroke, a pick or a blur superseded this answer
      const found = result.ok ? result.items.filter((item) => item.full_name) : [];
      setItems(found);
      setOpen(found.length > 0);
      setStatus(!result.ok ? "error" : found.length === 0 ? "empty" : "idle");
    }, SEARCH_DELAY_MS);
  }

  function go(item: SunnerOption) {
    supersede();
    setOpen(false);
    router.push(profileHref(item.id));
  }

  /** Enter and the magnifier: the highlighted row, else the first one, else nothing. */
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!open || items.length === 0) return;
    go(items[active >= 0 ? active : 0]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = items.length;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && count > 0) {
      event.preventDefault();
      setOpen(true);
      // From nothing: down -> first row, up -> last row; then wrap at both ends.
      setActive((at) => (event.key === "ArrowDown" ? (at + 1) % count : at < 0 ? count - 1 : (at - 1 + count) % count));
    } else if (event.key === "Escape" && (open || status !== "idle")) {
      event.preventDefault();
      setOpen(false);
      setStatus("idle");
    }
  }

  function onBlur() {
    supersede();
    setOpen(false);
    setItems([]);
    setActive(-1);
    setStatus("idle");
  }

  return { text, items, open, status, active, setActive, onChange, onKeyDown, onBlur, onSubmit, go };
}
