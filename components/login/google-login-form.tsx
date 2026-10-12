"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/lib/auth/sign-in-with-google";
import { GoogleLoginButton } from "./google-login-button";

function SubmitButton({ submitted }: { submitted: boolean }) {
  const { pending } = useFormStatus();
  return <GoogleLoginButton pending={pending || submitted} />;
}

export function GoogleLoginForm() {
  // The action ends in an external redirect, so `pending` can drop before the browser
  // leaves the page; `submitted` keeps the button disabled through that gap.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Coming back via bfcache restores the old DOM state — make the button usable again.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setSubmitted(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <form action={signInWithGoogle} onSubmit={() => setSubmitted(true)}>
      <SubmitButton submitted={submitted} />
    </form>
  );
}
