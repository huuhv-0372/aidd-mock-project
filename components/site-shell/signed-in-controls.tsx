import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { NotificationButton } from "./notification-button";
import type { ShellCopy } from "./shell-links";

/* Signed-in header controls: bell (left of the language selector) and account menu (right of it). */
export function SignedInControls({ copy, signOutSlot }: { copy: ShellCopy; signOutSlot: ReactNode }) {
  return (
    <>
      <div className="order-1">
        <NotificationButton label={copy.notifications.label} emptyText={copy.notifications.empty} />
      </div>
      <div className="order-3">
        <AccountMenu label={copy.account.label} profileLabel={copy.account.profile}>
          {signOutSlot}
        </AccountMenu>
      </div>
    </>
  );
}
