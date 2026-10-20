"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useStatusToast } from "@/components/ui/status-toast";
import type { setKudoHeart } from "@/lib/kudos/set-kudo-heart-action";

type HeartValue = { liked: boolean; count: number };
type HeartOverride = HeartValue & { pending: boolean };

type HeartsStore = {
  overrides: ReadonlyMap<string, HeartOverride>;
  toggle: (kudoId: string, current: HeartValue, errorMessage: string) => void;
};

const HeartsContext = createContext<HeartsStore | null>(null);

/*
 * Client-side heart state shared by every card of the Sun* Kudos board (Highlight carousel and the infinite feed), keyed by
 * Kudo id, so a Kudo shown in both places changes in both at once. It only holds Kudos the viewer clicked; every other card
 * reads the server props. A click flips the heart at once and locks it, then the server's answer replaces the guess; a refusal
 * puts the previous value back and raises a toast. The Server Action is injected so the store never imports server code.
 */
export function KudoHeartsProvider({ setHeart, children }: { setHeart: typeof setKudoHeart; children: ReactNode }) {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, HeartOverride>>(() => new Map());
  const inFlight = useRef(new Set<string>());
  const { show, toast } = useStatusToast();

  const put = useCallback((kudoId: string, value: HeartOverride) => {
    setOverrides((previous) => new Map(previous).set(kudoId, value));
  }, []);

  const toggle = useCallback<HeartsStore["toggle"]>(
    (kudoId, current, errorMessage) => {
      if (inFlight.current.has(kudoId)) return;
      inFlight.current.add(kudoId);
      const liked = !current.liked;
      put(kudoId, { liked, count: Math.max(0, current.count + (liked ? 1 : -1)), pending: true });

      const rollBack = () => {
        put(kudoId, { ...current, pending: false });
        show(errorMessage);
      };
      setHeart({ kudoId, liked })
        .then((result) => {
          if (result.ok) put(kudoId, { liked: result.liked, count: result.heartCount, pending: false });
          else rollBack();
        })
        .catch(rollBack)
        .finally(() => inFlight.current.delete(kudoId));
    },
    [put, setHeart, show],
  );

  const value = useMemo(() => ({ overrides, toggle }), [overrides, toggle]);
  return (
    <HeartsContext.Provider value={value}>
      {children}
      {toast}
    </HeartsContext.Provider>
  );
}

/** Current heart of a Kudo: the clicked state when there is one, else the server's `liked` / `count`. */
export function useKudoHeart(kudoId: string, server: HeartValue) {
  const store = useContext(HeartsContext);
  if (!store) throw new Error("useKudoHeart must be used inside <KudoHeartsProvider>");
  const override = store.overrides.get(kudoId);
  const liked = override?.liked ?? server.liked;
  const count = override?.count ?? server.count;
  const { toggle } = store;
  return { liked, count, pending: override?.pending ?? false, toggle: (errorMessage: string) => toggle(kudoId, { liked, count }, errorMessage) };
}
