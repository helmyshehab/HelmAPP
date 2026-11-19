import type { CatalogImportRunStatus } from "@helm/api-client-ts";

export type ImportHistoryQuery = {
  status?: CatalogImportRunStatus;
  dryRun?: boolean;
  sourceLabel?: string;
  limit: number;
  offset: number;
  selectedId?: string;
};

function first(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseImportHistorySearchParams(
  params: Record<string, string | string[] | undefined>,
): ImportHistoryQuery {
  const statusRaw = first(params.status);
  const status =
    statusRaw === "completed" ||
    statusRaw === "partial" ||
    statusRaw === "failed"
      ? statusRaw
      : undefined;

  const dryRunRaw = first(params.dryRun);
  const dryRun =
    dryRunRaw === "true" ? true : dryRunRaw === "false" ? false : undefined;

  const sourceLabel = first(params.sourceLabel)?.trim() || undefined;
  const limit = Math.min(
    100,
    Math.max(1, Number(first(params.limit) ?? 20) || 20),
  );
  const offset = Math.max(0, Number(first(params.offset) ?? 0) || 0);
  const selectedId = first(params.run)?.trim() || undefined;

  return { status, dryRun, sourceLabel, limit, offset, selectedId };
}

export function importHistoryHref(
  query: ImportHistoryQuery,
  overrides: Partial<ImportHistoryQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const sp = new URLSearchParams();
  if (next.status) sp.set("status", next.status);
  if (next.dryRun === true) sp.set("dryRun", "true");
  if (next.dryRun === false) sp.set("dryRun", "false");
  if (next.sourceLabel) sp.set("sourceLabel", next.sourceLabel);
  if (next.limit !== 20) sp.set("limit", String(next.limit));
  if (next.offset > 0) sp.set("offset", String(next.offset));
  if (next.selectedId) sp.set("run", next.selectedId);
  const q = sp.toString();
  return q ? `/import?${q}` : "/import";
}
