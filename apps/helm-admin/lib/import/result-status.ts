import type {
  CatalogImportResult,
  CatalogImportRunStatus,
} from "@helm/api-client-ts";

export type ImportOutcomeKind =
  | "dry_run_ok"
  | "dry_run_issues"
  | "apply_success"
  | "apply_partial"
  | "apply_failed"
  | "unknown";

/**
 * Classify import API results for truthful banners.
 * Prefer server `status` when present; never treat partial as full success.
 */
export function classifyImportResult(
  result: CatalogImportResult,
): ImportOutcomeKind {
  const status = result.status as CatalogImportRunStatus | undefined;
  const errorCount = result.errors?.length ?? 0;

  if (result.dryRun) {
    if (status === "completed" || errorCount === 0) return "dry_run_ok";
    return "dry_run_issues";
  }

  if (status === "completed" || (status == null && errorCount === 0)) {
    return "apply_success";
  }
  if (status === "failed") return "apply_failed";
  if (status === "partial") return "apply_partial";

  const created = result.created ?? 0;
  const updated = result.updated ?? 0;
  if (errorCount > 0 && created + updated > 0) return "apply_partial";
  if (errorCount > 0) return "apply_failed";
  return "unknown";
}

export function importOutcomeLabel(kind: ImportOutcomeKind): string {
  switch (kind) {
    case "dry_run_ok":
      return "Dry-run completed";
    case "dry_run_issues":
      return "Dry-run completed with issues";
    case "apply_success":
      return "Import applied successfully";
    case "apply_partial":
      return "Import partially applied";
    case "apply_failed":
      return "Import apply failed";
    default:
      return "Import finished";
  }
}

export function importRunStatusLabel(
  status: CatalogImportRunStatus,
  dryRun: boolean,
): string {
  if (dryRun) {
    if (status === "completed") return "Dry-run · completed";
    if (status === "partial") return "Dry-run · issues";
    return `Dry-run · ${status}`;
  }
  if (status === "completed") return "Apply · success";
  if (status === "partial") return "Apply · partial";
  if (status === "failed") return "Apply · failed";
  return status;
}
