import { MENU_ITEM } from "./shell-class-names";

/* Plain submit menuitem: the parent page wraps it in the sign-out <form action={...}>. */
export function SignOutButton() {
  return (
    <button type="submit" role="menuitem" className={MENU_ITEM}>
      Sign out
    </button>
  );
}
