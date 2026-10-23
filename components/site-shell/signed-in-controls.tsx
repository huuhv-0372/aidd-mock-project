import type { ReactNode } from "react";
import { ADMIN_PATH } from "@/lib/navigation/routes";
import { AccountMenu } from "./account-menu";
import { NotificationButton } from "./notification-button";
import type { ShellCopy } from "./shell-links";

/*
 * Signed-in header controls: bell (left of the language selector) and account menu (right of it).
 * `isAdmin` adds the Dashboard item (to /admin) between Profile and Sign out.
 */
export function SignedInControls({
  copy,
  signOutSlot,
  isAdmin = false,
}: {
  copy: ShellCopy;
  signOutSlot: ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <>
      <div className="order-1">
        <NotificationButton label={copy.notifications.label} emptyText={copy.notifications.empty} />
      </div>
      <div className="order-3">
        <AccountMenu
          label={copy.account.label}
          profileLabel={copy.account.profile}
          dashboardLabel={isAdmin ? copy.account.dashboard : undefined}
          dashboardHref={isAdmin ? ADMIN_PATH : undefined}
        >
          {signOutSlot}
        </AccountMenu>
      </div>
    </>
  );
}
