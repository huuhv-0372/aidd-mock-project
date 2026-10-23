import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const codesSchema = z.array(z.object({ code: z.string().min(1) }));

/** Unit filter options: `public.departments.code` in catalog order. Never throws: any failure is logged -> null. */
export async function getAdminDepartmentCodes(client?: ServerClient): Promise<string[] | null> {
  try {
    const supabase = client ?? (await createSupabaseServerClient());
    const { data, error } = await supabase.from("departments").select("code").order("sort_order");
    if (error) {
      console.error("[admin] departments failed", error);
      return null;
    }
    const parsed = codesSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[admin] departments returned malformed rows", parsed.error.issues.map((i) => i.path.join(".")));
      return null;
    }
    return parsed.data.map((row) => row.code);
  } catch (err) {
    console.error("[admin] departments unexpected failure", err);
    return null;
  }
}
