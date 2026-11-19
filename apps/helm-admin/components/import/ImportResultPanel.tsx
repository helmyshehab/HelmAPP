import Link from "next/link";
import type { CatalogImportResult } from "@helm/api-client-ts";
import {
  classifyImportResult,
  importOutcomeLabel,
} from "../../lib/import/result-status";
import styles from "./import.module.css";

type ImportResultPanelProps = {
  result: CatalogImportResult;
};

function countLine(result: CatalogImportResult): string {
  if (result.dryRun) {
    return [
      `Would create ${result.wouldCreate ?? 0}`,
      `update ${result.wouldUpdate ?? 0}`,
      `skip ${result.wouldSkip ?? 0}`,
      `(destinations ${result.destinationsInPayload ?? 0}, places ${result.placesInPayload ?? 0})`,
    ].join(" · ");
  }
  return [
    `Created ${result.created ?? 0}`,
    `updated ${result.updated ?? 0}`,
    `skipped ${result.skipped ?? 0}`,
    `(destinations ${result.destinationsInPayload ?? 0}, places ${result.placesInPayload ?? 0})`,
  ].join(" · ");
}

export function ImportResultPanel({ result }: ImportResultPanelProps) {
  const kind = classifyImportResult(result);
  const boxClass =
    kind === "apply_success" || kind === "dry_run_ok"
      ? styles.successBox
      : kind === "apply_partial" || kind === "dry_run_issues"
        ? styles.warnBox
        : styles.errorBox;

  return (
    <section className={styles.panel} aria-live="polite">
      <h2 className={styles.panelTitle}>Latest result</h2>
      <div className={boxClass} role="status">
        <strong>{importOutcomeLabel(kind)}</strong>
        {result.status ? (
          <span className={styles.muted}> · status `{result.status}`</span>
        ) : null}
        <div className={styles.hint}>{countLine(result)}</div>
        <div className={styles.hint}>
          Import run id: <code>{result.importRunId}</code>
        </div>
      </div>

      {kind === "apply_partial" ? (
        <p className={styles.hint}>
          Some records were written as draft and some failed. Review errors
          below, fix the JSON, dry-run again, then apply only after another
          successful dry-run.{" "}
          <Link href="/destinations">Open destinations</Link> to inspect what
          was created.
        </p>
      ) : null}

      {kind === "apply_success" ? (
        <p className={styles.hint}>
          Records were created or updated as <strong>draft</strong>. Continue in{" "}
          <Link href="/destinations">Destinations</Link> for lifecycle curation.
        </p>
      ) : null}

      {result.errors && result.errors.length > 0 ? (
        <div className={styles.detailBlock}>
          <h3 className={styles.panelTitle}>Errors ({result.errors.length})</h3>
          <ul className={styles.list}>
            {result.errors.map((err, index) => (
              <li key={`${err.path ?? "err"}-${index}`}>
                {err.path ? <code>{err.path}</code> : null}
                {err.path ? ": " : null}
                {err.message ?? "Unknown error"}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.muted}>No row-level errors reported.</p>
      )}
    </section>
  );
}
