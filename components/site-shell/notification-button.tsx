"use client";

import { useCallback, useId, useRef, useState } from "react";
import { HEADER_ICON_BUTTON, HEADER_PANEL } from "./shell-class-names";
import { IconBell } from "./shell-icons";
import { useDismissable } from "./use-dismissable";

/* No notifications source yet (clarified): always the empty panel, never a badge. */
export function NotificationButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  useDismissable(open, rootRef, close);

  return (
    // mm:I2167:9091;186:2101
    <div ref={rootRef} className="relative">
      {/* mm:I2167:9091;186:2101;186:2020 */}
      <button
        ref={buttonRef}
        type="button"
        data-testid="notification-button"
        aria-label="Thông báo"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={`${HEADER_ICON_BUTTON} outline-offset-0 outline-white focus-visible:outline-2`}
      >
        {/* mm:I2167:9091;186:2101;186:2020;186:1420 */}
        <IconBell />
      </button>
      {open ? (
        <div
          id={panelId}
          data-testid="notification-panel"
          role="region"
          aria-label="Thông báo"
          className={`${HEADER_PANEL} min-w-60`}
        >
          <p className="px-4 py-3 text-base leading-6 font-bold text-white">Chưa có thông báo</p>
        </div>
      ) : null}
    </div>
  );
}
