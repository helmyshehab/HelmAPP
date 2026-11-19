import type { LifecycleStatus } from "@helm/api-client-ts";
import { LIFECYCLE_STATUSES } from "./lifecycle-ui";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type DestinationListQuery = {
  q?: string;
  country?: string;
  lifecycleStatus?: LifecycleStatus;
  featured?: boolean;
  topLevelOnly?: boolean;
  limit: number;
  offset: number;
};

function first(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseLifecycle(
  raw: string | undefined,
): LifecycleStatus | undefined {
  if (!raw) return undefined;
  return (LIFECYCLE_STATUSES as readonly string[]).includes(raw)
    ? (raw as LifecycleStatus)
    : undefined;
}

function parseBoolFlag(raw: string | undefined): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function parseDestinationListSearchParams(
  params: Record<string, string | string[] | undefined>,
): DestinationListQuery {
  const q = first(params.q)?.trim() || undefined;
  const countryRaw = first(params.country)?.trim().toUpperCase();
  const country =
    countryRaw && /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : undefined;
  const lifecycleStatus = parseLifecycle(first(params.lifecycleStatus));
  const featured = parseBoolFlag(first(params.featured));
  const topLevelOnly = parseBoolFlag(first(params.topLevelOnly));

  let limit = Number(first(params.limit) ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(limit)) limit = DEFAULT_PAGE_SIZE;
  limit = Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);

  let offset = Number(first(params.offset) ?? 0);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  offset = Math.trunc(offset);

  return {
    q,
    country,
    lifecycleStatus,
    featured,
    topLevelOnly,
    limit,
    offset,
  };
}

export function buildDestinationListHref(
  query: DestinationListQuery,
  overrides: Partial<DestinationListQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.country) sp.set("country", next.country);
  if (next.lifecycleStatus) sp.set("lifecycleStatus", next.lifecycleStatus);
  if (next.featured === true) sp.set("featured", "true");
  if (next.topLevelOnly === true) sp.set("topLevelOnly", "true");
  if (next.limit !== DEFAULT_PAGE_SIZE) sp.set("limit", String(next.limit));
  if (next.offset > 0) sp.set("offset", String(next.offset));
  const s = sp.toString();
  return s ? `/destinations?${s}` : "/destinations";
}
