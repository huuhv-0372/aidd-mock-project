"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/lib/auth/sign-in-with-google";
import { GoogleLoginButton } from "./google-login-button";

function SubmitButton({ label, submitted }: { label: string; submitted: boolean }) {
  const { pending } = useFormStatus();
  return <GoogleLoginButton label={label} pending={pending || submitted} />;
}

export function GoogleLoginForm({ label }: { label: string }) {
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
      <SubmitButton label={label} submitted={submitted} />
    </form>
  );
}
