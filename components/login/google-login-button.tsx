/*
 * Presentational submit button; the owning <form> (google-login-form.tsx) wires the action.
 * While `pending` the button is disabled and a spinner overlays the Google icon slot
 * (the icon stays in the DOM so the slot width never shifts).
 */
export function GoogleLoginButton({ pending = false }: { pending?: boolean }) {
  return (
    // mm:662:14426
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-15 font-montserrat min-w-11 cursor-pointer items-center gap-2 rounded-lg bg-login-accent px-6 py-4 text-[22px] leading-7 font-bold whitespace-nowrap text-login-bg outline-offset-4 outline-white focus-visible:outline-2 enabled:hover:shadow-[0_8px_24px_rgba(255,234,158,0.4)] enabled:active:translate-y-px enabled:active:shadow-[0_2px_8px_rgba(255,234,158,0.4)] disabled:cursor-not-allowed disabled:opacity-80 motion-safe:transition-[box-shadow,transform] motion-safe:duration-200 motion-safe:ease-out"
    >
      {/* mm:I662:14426;186:1568 */}
      <span>LOGIN With Google</span>
      {/* mm:I662:14426;186:1766 */}
      <span className="relative inline-flex size-6 shrink-0">
        <svg
          data-testid="google-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={pending ? "opacity-0" : undefined}
        >
          <path d="M20.8245 12.2073C20.8245 11.5955 20.7748 10.9804 20.669 10.3785H12.1799V13.8443H17.0412C16.8395 14.962 16.1913 15.9508 15.2422 16.5792V18.8279H18.1425C19.8456 17.2604 20.8245 14.9455 20.8245 12.2073Z" fill="#4285F4" />
          <path d="M12.1799 21.0006C14.6073 21.0006 16.6543 20.2036 18.1458 18.8279L15.2455 16.5792C14.4386 17.1281 13.3969 17.439 12.1832 17.439C9.83527 17.439 7.84445 15.8549 7.13014 13.7252H4.1373V16.0434C5.66514 19.0826 8.77703 21.0006 12.1799 21.0006Z" fill="#34A853" />
          <path d="M7.12684 13.7252C6.74984 12.6074 6.74984 11.3971 7.12684 10.2793V7.96112H4.13731C2.86081 10.5042 2.8608 13.5003 4.1373 16.0434L7.12684 13.7252Z" fill="#FBBC04" />
          <path d="M12.1799 6.56224C13.463 6.5424 14.7032 7.02523 15.6324 7.9115L18.202 5.34196C16.5749 3.81413 14.4155 2.97415 12.1799 3.00061C8.77702 3.00061 5.66515 4.91868 4.13731 7.96112L7.12684 10.2793C7.83785 8.14631 9.83196 6.56224 12.1799 6.56224Z" fill="#EA4335" />
        </svg>
        {pending ? (
          <span
            data-testid="login-loader"
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-login-bg/25 border-t-login-bg motion-safe:animate-spin"
          />
        ) : null}
      </span>
    </button>
  );
}
