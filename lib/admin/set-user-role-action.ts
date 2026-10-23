"use server";

import type { SetUserRoleInput, SetUserRoleResult } from "@/lib/admin/admin-user-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setUserRoleAnswerSchema, setUserRoleInputSchema } from "@/lib/validation/admin-users";

const SERVER_ERROR = { ok: false, error: "server" } as const;

/**
 * Changes another user's role through `admin_set_user_role`, which decides everything in the database (advisory lock,
 * then forbidden -> self -> invalid -> not_found -> ok). Input is untrusted: validated first, the RPC is never called
 * for bad input. Next.js checks the Origin of Server Actions. Failures are logged (codes only); the client gets a
 * fixed error code, never a database message.
 */
export async function setUserRole(input: SetUserRoleInput): Promise<SetUserRoleResult> {
  const parsed = setUserRoleInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[admin] set role rejected invalid input", parsed.error.issues.map((issue) => issue.path.join(".")));
    return { ok: false, error: "validation" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: parsed.data.userId,
      p_role: parsed.data.role,
    });
    if (error) {
      console.error("[admin] admin_set_user_role failed", error);
      return SERVER_ERROR;
    }
    const answer = setUserRoleAnswerSchema.safeParse(data);
    if (!answer.success) {
      console.error("[admin] admin_set_user_role returned an unexpected result");
      return SERVER_ERROR;
    }
    switch (answer.data) {
      case "ok":
        return { ok: true };
      case "invalid":
        return { ok: false, error: "validation" };
      default:
        console.error("[admin] admin_set_user_role refused", answer.data);
        return { ok: false, error: answer.data };
    }
  } catch (err) {
    console.error("[admin] set role unexpected failure", err);
    return SERVER_ERROR;
  }
}
