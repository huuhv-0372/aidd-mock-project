"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { adminUsersHref } from "@/lib/admin/admin-users-href";
import { ADMIN_LEVELS, ADMIN_ROLES, type AdminLevel, type AdminRole, type AdminUserFilters } from "@/lib/admin/admin-user-types";
import type { Dictionary } from "@/messages/vi";
import { AdminFilterDropdown, type AdminFilterOption } from "./admin-filter-dropdown";
import { AdminSearchBox } from "./admin-search-box";

type Props = {
  filters: AdminUserFilters;
  /** Department codes for the Unit list; empty when they could not be read (only "all" is offered). */
  unitCodes: readonly string[];
  copy: Dictionary["admin"]["filters"];
  roleNames: Dictionary["admin"]["table"]["roles"];
};

/*
 * Unit / Level / Role fields and Search (Figma 773:26408): a row from md up, stacked on a phone. Every change writes the URL
 * (`adminUsersHref`, page back to 1, sort kept) and the server re-renders the table. `latest` is the filter state we last pushed:
 * a second pick made before the first navigation commits must build on the first, not on the stale props, and it re-syncs
 * to the props once no navigation is pending.
 */
export function AdminUsersFilters({ filters, unitCodes, copy, roleNames }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const latest = useRef(filters);
  useEffect(() => {
    if (!pending) latest.current = filters;
  }, [filters, pending]);

  const apply = useCallback(
    (partial: Partial<AdminUserFilters>) => {
      latest.current = { ...latest.current, ...partial, page: 1 };
      const href = adminUsersHref(latest.current);
      startTransition(() => router.push(href, { scroll: false }));
    },
    [router],
  );

  const all: AdminFilterOption = { value: "all", label: copy.all };
  const unitOptions = [all, ...unitCodes.map((code) => ({ value: code, label: code }))];
  const levelOptions = [all, ...ADMIN_LEVELS.map((level) => ({ value: String(level), label: copy.levels[String(level) as keyof typeof copy.levels] }))];
  const roleOptions = [all, ...ADMIN_ROLES.map((role) => ({ value: role, label: roleNames[role] }))];

  return (
    <div
      role="group"
      aria-label={copy.ariaLabel}
      aria-busy={pending}
      className={`flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end ${pending ? "opacity-70" : ""}`}
    >
      <AdminFilterDropdown
        name="unit"
        label={copy.unit.label}
        placeholder={copy.unit.placeholder}
        listLabel={copy.unit.listLabel}
        options={unitOptions}
        value={filters.unit}
        onChange={(value) => apply({ unit: value })}
        widthClass="w-full md:w-[259px]"
      />
      <AdminFilterDropdown
        name="level"
        label={copy.level.label}
        placeholder={copy.level.placeholder}
        listLabel={copy.level.listLabel}
        options={levelOptions}
        value={filters.level === null ? null : String(filters.level)}
        onChange={(value) => apply({ level: value === null ? null : (Number(value) as AdminLevel) })}
        widthClass="w-full md:w-auto md:min-w-[136px]"
      />
      <AdminFilterDropdown
        name="role"
        label={copy.role.label}
        placeholder={copy.role.placeholder}
        listLabel={copy.role.listLabel}
        options={roleOptions}
        value={filters.role}
        onChange={(value) => apply({ role: value as AdminRole | null })}
        widthClass="w-full md:w-[123px]"
      />
      <div className="md:ml-auto">
        <AdminSearchBox
          q={filters.q}
          onSearch={(q) => apply({ q })}
          placeholder={copy.search.placeholder}
          label={copy.search.label}
          submitLabel={copy.search.submit}
        />
      </div>
    </div>
  );
}
