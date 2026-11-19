export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PlaceListQuery = {
  q?: string;
  category?: string;
  limit: number;
  offset: number;
};

function first(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parsePlaceListSearchParams(
  params: Record<string, string | string[] | undefined>,
): PlaceListQuery {
  const q = first(params.q)?.trim() || undefined;
  const category = first(params.category)?.trim() || undefined;

  let limit = Number(first(params.limit) ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(limit)) limit = DEFAULT_PAGE_SIZE;
  limit = Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);

  let offset = Number(first(params.offset) ?? 0);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  offset = Math.trunc(offset);

  return {
    q,
    category,
    limit,
    offset,
  };
}

export function buildPlaceListHref(
  query: PlaceListQuery,
  overrides: Partial<PlaceListQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.category) sp.set("category", next.category);
  if (next.limit !== DEFAULT_PAGE_SIZE) sp.set("limit", String(next.limit));
  if (next.offset > 0) sp.set("offset", String(next.offset));
  const s = sp.toString();
  return s ? `/places?${s}` : "/places";
}
