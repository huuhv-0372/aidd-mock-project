"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useModalDialog } from "@/components/kudos-compose/use-modal-dialog";
import { setUserRole } from "@/lib/admin/set-user-role-action";
import type { AdminRole } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";

type Props = {
  userId: string;
  name: string;
  email: string;
  /** The role the user would get. */
  targetRole: AdminRole;
  copy: Dictionary["admin"]["roleDialog"];
  /** Cancel, Esc or a click on the backdrop. */
  onClose: () => void;
  /** The role was changed. */
  onChanged: () => void;
};

const BUTTON =
  "min-h-11 min-w-24 cursor-pointer rounded px-4 text-base leading-6 font-bold outline-offset-2 focus-visible:outline-2 focus-visible:outline-login-accent disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-200";

/*
 * Confirm step of a role change (not from Figma: the frame has none). Native <dialog> + showModal(): focus trap, Esc, inert page;
 * the first focusable is Cancel, so that is where focus lands. Shows who is affected (name + email). Any refusal or failure
 * of the Server Action shows the one generic line and keeps the dialog open; the raw reason never reaches the screen. While the call is
 * running both buttons are locked and Esc / backdrop do nothing, so a second click cannot send a second change.
 */
export function RoleChangeDialog({ userId, name, email, targetRole, copy, onClose, onChanged }: Props) {
  const ref = useModalDialog(true);
  const titleId = useId();
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // The locked Confirm button dropped focus while the call ran: put it back for a retry once the error is shown.
  useEffect(() => {
    if (failed) confirmRef.current?.focus();
  }, [failed]);

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setFailed(false);
    try {
      const result = await setUserRole({ userId, role: targetRole });
      if (result.ok) {
        onChanged();
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    busy.current = false;
    setSubmitting(false);
  }

  return (
    <dialog
      ref={ref}
      data-testid="admin-role-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => busy.current && event.preventDefault()}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && !busy.current && onClose()}
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-lg border border-home-border bg-kudos-panel p-6 text-left text-white backdrop:bg-black/60"
    >
      <h2 id={titleId} className="text-xl leading-7 font-bold">
        {copy.title}
      </h2>
      <p className="mt-4 text-base leading-6 font-bold break-words">{name}</p>
      <p className="text-sm leading-5 break-all text-white/80">{email}</p>
      <p className="mt-4 text-base leading-6">{targetRole === "admin" ? copy.toAdmin : copy.toUser}</p>
      {failed ? (
        <p role="alert" data-testid="admin-role-error" className="mt-4 text-sm leading-5 font-bold text-[#ff8a80]">
          {copy.failed}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          data-testid="admin-role-cancel"
          disabled={submitting}
          onClick={onClose}
          className={`${BUTTON} border border-home-border text-white hover:bg-white/10`}
        >
          {copy.cancel}
        </button>
        <button
          ref={confirmRef}
          type="button"
          data-testid="admin-role-confirm"
          disabled={submitting}
          onClick={confirm}
          className={`${BUTTON} bg-login-accent text-login-bg hover:bg-[#fff3c4]`}
        >
          {copy.confirm}
        </button>
      </div>
    </dialog>
  );
}
