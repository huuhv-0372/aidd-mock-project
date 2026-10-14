import { signOut } from "@/lib/auth/sign-out";
import { SignOutButton } from "./sign-out-button";

/* Server component: the form posts to the signOut server action, no client JS needed. */
export function SignOutForm() {
  return (
    <form action={signOut}>
      <SignOutButton />
    </form>
  );
}
