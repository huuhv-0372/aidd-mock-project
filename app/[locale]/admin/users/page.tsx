import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminUsersView } from "@/components/admin/admin-users-view";
import { getAdminDepartmentCodes } from "@/lib/admin/get-admin-department-codes";
import { getAdminUsers } from "@/lib/admin/get-admin-users";
import { parseAdminUserFilters } from "@/lib/admin/parse-admin-user-filters";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getRouteDictionary } from "@/lib/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dict } = await getRouteDictionary(params);
  return { title: dict.admin.metaTitle };
}

/*
 * Admin - User (Figma 773:26403). The URL is the state (`unit level role q sort dir page`): parsed and clamped by zod in
 * parseAdminUserFilters, so a bad value is dropped, never a 500. requireAdmin() again: the layout does not re-run on a soft navigation.
 */
export default async function AdminUsersPage({ params, searchParams }: PageProps) {
  const { dict } = await getRouteDictionary(params);
  await connection();
  await requireAdmin();
  const filters = parseAdminUserFilters(await searchParams);
  const [result, unitCodes] = await Promise.all([getAdminUsers(filters), getAdminDepartmentCodes()]);
  return <AdminUsersView filters={filters} result={result} unitCodes={unitCodes} dict={dict} />;
}
