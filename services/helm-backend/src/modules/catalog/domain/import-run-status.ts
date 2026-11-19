/**
 * Aligns CatalogImportResult.status with catalog.import_runs.status.
 */

export const IMPORT_RUN_STATUSES = ['completed', 'partial', 'failed'] as const;
export type ImportRunStatus = (typeof IMPORT_RUN_STATUSES)[number];

export function isImportRunStatus(value: string): value is ImportRunStatus {
  return (IMPORT_RUN_STATUSES as readonly string[]).includes(value);
}

/**
 * completed — no row-level errors
 * partial — dry-run with preview errors, OR apply with mutations + errors
 * failed — apply with errors and zero destination/place create/update mutations
 */
export function resolveImportRunStatus(input: {
  dryRun: boolean;
  errorCount: number;
  created: number;
  updated: number;
}): ImportRunStatus {
  if (input.errorCount <= 0) return 'completed';
  if (input.dryRun) return 'partial';
  if (input.created + input.updated > 0) return 'partial';
  return 'failed';
}
