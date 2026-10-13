"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { PROFILE_PATH } from "@/lib/navigation/routes";
import { HEADER_ICON_BUTTON, HEADER_PANEL, MENU_ITEM } from "./home-class-names";
import { IconUserProfile } from "./home-icons";
import { useDismissable } from "./use-dismissable";

const menuItems = (menu: HTMLElement | null) =>
  Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

/*
 * Profile button + dropdown. `children` is the sign-out slot (a <form> holding SignOutButton),
 * rendered only while the menu is open. Items: Profile + Sign out (no Admin Dashboard: no roles yet).
 */
export function AccountMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  useDismissable(open, rootRef, close);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) menuItems(menuRef.current)[0]?.focus();
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = menuItems(menuRef.current);
    const current = list.findIndex((el) => el === document.activeElement);
    const focusAt = (index: number) => list[(index + list.length) % list.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    // mm:I2167:9091;186:1597
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        data-testid="account-menu-button"
        aria-label="Tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={`${HEADER_ICON_BUTTON} border border-home-border outline-offset-0 outline-white focus-visible:outline-2`}
      >
        {/* mm:I2167:9091;186:1597;186:1420 */}
        <IconUserProfile />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Tài khoản"
          onKeyDown={onMenuKeyDown}
          className={HEADER_PANEL}
        >
          <Link href={PROFILE_PATH} role="menuitem" onClick={() => close(false)} className={MENU_ITEM}>
            Profile
          </Link>
          <div role="none">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
