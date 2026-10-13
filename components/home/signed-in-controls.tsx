import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { NotificationButton } from "./notification-button";

/* Signed-in header controls: bell (left of the language selector) and account menu (right of it). */
export function SignedInControls({ signOutSlot }: { signOutSlot: ReactNode }) {
  return (
    <>
      <div className="order-1">
        <NotificationButton />
      </div>
      <div className="order-3">
        <AccountMenu>{signOutSlot}</AccountMenu>
      </div>
    </>
  );
}
