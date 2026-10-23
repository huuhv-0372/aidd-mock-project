"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useDismissable } from "@/components/site-shell/use-dismissable";
import type { AdminRole } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";
import { FOCUS_ON_DARK } from "./admin-class-names";
import { useAdminToast } from "./admin-toast";
import { IconMoreCircle } from "./admin-icons";
import { RoleChangeDialog } from "./role-change-dialog";

type Props = {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  /** The viewer's own row: no role action (an admin cannot change their own role). */
  isSelf: boolean;
  copy: Pick<Dictionary["admin"], "rowActions" | "roleDialog">;
};

const MENU_HEIGHT = 56;
type MenuPlace = { right: number; top?: number; bottom?: number };

/* Where the fixed panel goes for a button rectangle: under the button, flipped above it near the bottom of the screen. */
function placeFor(rect: DOMRect): MenuPlace {
  const right = document.documentElement.clientWidth - rect.right;
  const fitsBelow = window.innerHeight - rect.bottom > MENU_HEIGHT + 8;
  return fitsBelow ? { right, top: rect.bottom + 4 } : { right, bottom: window.innerHeight - rect.top + 4 };
}

/* The button is entirely above or below the viewport (a page scroll that keeps it visible must not close the menu). */
function isOffscreen(rect: DOMRect): boolean {
  return rect.bottom < 0 || rect.top > window.innerHeight;
}

/* The button no longer sits inside the visible box of the table's scroll container (scrolled sideways / vertically until clipped). */
function isClippedByScroller(rect: DOMRect, button: HTMLElement | null): boolean {
  const box = button?.closest('[data-testid="admin-table-scroll"]')?.getBoundingClientRect();
  if (!box) return false;
  const slack = 1; // sub-pixel rounding of the borders
  return rect.left < box.left - slack || rect.right > box.right + slack || rect.top < box.top - slack || rect.bottom > box.bottom + slack;
}

/*
 * The round "..." of the Actions column (Figma 773 ROW - User) and what it opens: a one-item menu ("Change to Admin" / "Change to
 * User") that leads to the confirm dialog. The viewer's own row gets a disabled button whose label says why. The menu is `fixed`
 * (placed from the button's rectangle, flipped above near the bottom of the screen) because the table box scrolls sideways: an
 * absolute panel would be clipped by it. A scroll or resize re-anchors the panel to the button's current rectangle (one rAF per
 * frame) instead of closing it: the row can be scrolled into view right after the click (smooth scroll, a test runner, the page
 * moving under the pointer) and the menu must survive that. It closes only once the button has left the viewport entirely or is clipped by the table's scroll box.
 * Success refreshes the server data and shows the toast.
 */
export function AdminUserActionsMenu({ userId, name, email, role, isSelf, copy }: Props) {
  const router = useRouter();
  const showToast = useAdminToast();
  const [place, setPlace] = useState<MenuPlace | null>(null);
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const open = place !== null;
  const targetRole: AdminRole = role === "admin" ? "user" : "admin";

  const close = useCallback((restoreFocus: boolean) => {
    setPlace(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  useDismissable(open, rootRef, close);

  // Focus moves into the menu when it opens (without scrolling the page); scroll / resize re-anchor the panel to the button.
  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus({ preventScroll: true });
    let frame = 0;
    const reanchor = () => {
      frame = 0;
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect || isOffscreen(rect) || isClippedByScroller(rect, buttonRef.current)) return setPlace(null);
      setPlace(placeFor(rect));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(reanchor);
    };
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [open]);

  function toggle() {
    if (open) return close(false);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPlace(placeFor(rect));
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") return close(false);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      itemRef.current?.focus({ preventScroll: true }); // a single item: every arrow lands on it
    }
  }

  function onDialogClose() {
    setConfirming(false);
    buttonRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        data-testid="admin-row-actions"
        disabled={isSelf}
        aria-label={isSelf ? copy.rowActions.self : copy.rowActions.label.replace("{name}", name)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={`flex size-11 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10 aria-expanded:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-safe:transition-colors motion-safe:duration-200 ${FOCUS_ON_DARK}`}
      >
        <IconMoreCircle />
      </button>
      {place && (
        <div
          role="menu"
          data-testid="admin-role-menu"
          aria-label={copy.rowActions.label.replace("{name}", name)}
          onKeyDown={onMenuKeyDown}
          style={place}
          className="fixed z-40 min-w-48 overflow-hidden rounded border border-login-divider bg-login-bg py-1 text-left"
        >
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            data-testid="admin-role-item"
            onClick={() => {
              setPlace(null);
              setConfirming(true);
            }}
            className="flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-base leading-6 font-bold tracking-[0.15px] text-white outline-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-login-accent motion-safe:transition-colors motion-safe:duration-200"
          >
            {targetRole === "admin" ? copy.rowActions.toAdmin : copy.rowActions.toUser}
          </button>
        </div>
      )}
      {confirming && (
        <RoleChangeDialog
          userId={userId}
          name={name}
          email={email}
          targetRole={targetRole}
          copy={copy.roleDialog}
          onClose={onDialogClose}
          onChanged={() => {
            onDialogClose();
            router.refresh();
            showToast(copy.roleDialog.updated);
          }}
        />
      )}
    </div>
  );
}
