"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HashtagOption, WriteKudoActions } from "./write-kudo-types";

type GetHashtagOptions = WriteKudoActions["getHashtagOptions"];

/** The catalog, or null when the call rejected or answered `{ ok: false }`. The cause is only logged, never shown. */
async function fetchCatalog(getHashtagOptions: GetHashtagOptions): Promise<HashtagOption[] | null> {
  try {
    const result = await getHashtagOptions();
    return result.ok ? result.items : null;
  } catch (err) {
    console.error("[kudos] hashtag options request failed", err);
    return null;
  }
}

/**
 * Loads the hashtag catalog once when the form mounts. On failure `failed` is set: the picker explains it and offers `retry`.
 * Only the newest request may write state, so a slow older answer never overwrites a newer one.
 */
export function useHashtagOptions(getHashtagOptions: GetHashtagOptions) {
  const [options, setOptions] = useState<HashtagOption[]>([]);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  const newest = useRef(0);

  /** Applies an answer unless a newer request (or the unmount) made it moot; resolves to whether the catalog loaded, null when moot. */
  const settle = useCallback((request: number, items: HashtagOption[] | null) => {
    if (!alive.current || request !== newest.current) return null;
    if (items) setOptions(items);
    setFailed(items === null);
    return items !== null;
  }, []);

  const load = useCallback(() => {
    const request = ++newest.current;
    return fetchCatalog(getHashtagOptions).then((items) => settle(request, items));
  }, [getHashtagOptions, settle]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const retry = useCallback(() => {
    setFailed(false);
    return load();
  }, [load]);

  return { options, failed, retry };
}
