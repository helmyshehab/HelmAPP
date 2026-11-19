import assert from "node:assert/strict";
import test from "node:test";
import type { CatalogImportResult } from "@helm/api-client-ts";
import { classifyImportResult } from "../lib/import/result-status.ts";

function result(
  partial: Partial<CatalogImportResult> &
    Pick<CatalogImportResult, "dryRun" | "importRunId">,
): CatalogImportResult {
  return partial;
}

test("classifyImportResult never treats partial apply as success", () => {
  assert.equal(
    classifyImportResult(
      result({
        dryRun: false,
        importRunId: "11111111-1111-1111-1111-111111111111",
        status: "partial",
        created: 2,
        updated: 0,
        errors: [{ path: "places.1", message: "boom" }],
      }),
    ),
    "apply_partial",
  );
});

test("classifyImportResult maps failed apply", () => {
  assert.equal(
    classifyImportResult(
      result({
        dryRun: false,
        importRunId: "11111111-1111-1111-1111-111111111111",
        status: "failed",
        created: 0,
        updated: 0,
        errors: [{ path: "destinations.0", message: "unknown country" }],
      }),
    ),
    "apply_failed",
  );
});

test("classifyImportResult maps dry-run completed", () => {
  assert.equal(
    classifyImportResult(
      result({
        dryRun: true,
        importRunId: "11111111-1111-1111-1111-111111111111",
        status: "completed",
        wouldCreate: 3,
        errors: [],
      }),
    ),
    "dry_run_ok",
  );
});
