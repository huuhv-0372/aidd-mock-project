import { kudosFiltersSchema, type KudosFilters } from "@/lib/validation/kudos";

/** Next.js `searchParams` value shape. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Allowed filter values; a filter whose catalog is `null` (failed to load) is dropped. */
export type KudosFilterCatalog = {
  hashtagSlugs: readonly string[] | null;
  departmentCodes: readonly string[] | null;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** `?hashtag=&department=` -> filters, keeping only values present in the catalog (unknown -> dropped). */
export function parseKudosFilters(params: RawSearchParams, catalog: KudosFilterCatalog): KudosFilters {
  const parsed = kudosFiltersSchema.safeParse({
    hashtag: first(params.hashtag),
    department: first(params.department),
  });
  const candidate = parsed.success ? parsed.data : {};
  const filters: KudosFilters = {};
  if (candidate.hashtag && catalog.hashtagSlugs?.includes(candidate.hashtag)) {
    filters.hashtag = candidate.hashtag;
  }
  if (candidate.department && catalog.departmentCodes?.includes(candidate.department)) {
    filters.department = candidate.department;
  }
  return filters;
}
