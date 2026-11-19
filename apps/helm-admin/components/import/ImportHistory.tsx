import Link from "next/link";
import type {
  CatalogImportRunDetail,
  CatalogImportRunListResponse,
} from "@helm/api-client-ts";
import {
  importHistoryHref,
  type ImportHistoryQuery,
} from "../../lib/import/query";
import { importRunStatusLabel } from "../../lib/import/result-status";
import styles from "./import.module.css";

type ImportHistoryProps = {
  query: ImportHistoryQuery;
  list: CatalogImportRunListResponse | null;
  listError: string | null;
  detail: CatalogImportRunDetail | null;
  detailError: string | null;
  isAdmin: boolean;
};

function badgeClass(status: string): string {
  if (status === "completed") return `${styles.badge} ${styles.badgeCompleted}`;
  if (status === "partial") return `${styles.badge} ${styles.badgePartial}`;
  return `${styles.badge} ${styles.badgeFailed}`;
}

function summarizeCounts(
  dryRun: boolean,
  summary: Record<string, number | undefined>,
): string {
  if (dryRun) {
    return `would +${summary.wouldCreate ?? 0} ~${summary.wouldUpdate ?? 0} skip ${summary.wouldSkip ?? 0}`;
  }
  return `+${summary.created ?? 0} ~${summary.updated ?? 0} skip ${summary.skipped ?? 0}`;
}

export function ImportHistory({
  query,
  list,
  listError,
  detail,
  detailError,
  isAdmin,
}: ImportHistoryProps) {
  const total = list?.total ?? 0;
  const limit = list?.limit ?? query.limit;
  const offset = list?.offset ?? query.offset;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Import history</h2>
      <p className={styles.muted}>
        Newest first from <code>catalog.import_runs</code>. Totals below are for
        the current filter set only — not invented global KPIs.
        {isAdmin
          ? " Administrators can open audit events for a run via the audit API when needed."
          : null}
      </p>

      <form className={styles.filters} method="get" action="/import">
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Status</span>
          <select
            className={styles.select}
            name="status"
            defaultValue={query.status ?? ""}
          >
            <option value="">All</option>
            <option value="completed">completed</option>
            <option value="partial">partial</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Mode</span>
          <select
            className={styles.select}
            name="dryRun"
            defaultValue={
              query.dryRun === true
                ? "true"
                : query.dryRun === false
                  ? "false"
                  : ""
            }
          >
            <option value="">All</option>
            <option value="true">Dry-run</option>
            <option value="false">Apply</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Source label</span>
          <input
            className={styles.input}
            name="sourceLabel"
            defaultValue={query.sourceLabel ?? ""}
            placeholder="Contains…"
          />
        </label>
        <button type="submit" className={styles.secondaryButton}>
          Filter
        </button>
      </form>

      {listError ? (
        <div className={styles.errorBox} role="alert">
          {listError}
        </div>
      ) : null}

      {list && list.items.length === 0 ? (
        <p className={styles.muted} role="status">
          No import runs match these filters yet.
        </p>
      ) : null}

      {list && list.items.length > 0 ? (
        <>
          <p className={styles.hint}>
            Showing {offset + 1}–{Math.min(offset + list.items.length, total)} of{" "}
            {total} matching run{total === 1 ? "" : "s"}.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Status</th>
                  <th scope="col">Source</th>
                  <th scope="col">Counts</th>
                  <th scope="col">Errors</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <time dateTime={run.createdAt}>
                        {new Date(run.createdAt).toLocaleString()}
                      </time>
                    </td>
                    <td>
                      <span className={badgeClass(run.status)}>
                        {importRunStatusLabel(run.status, run.dryRun)}
                      </span>
                    </td>
                    <td>{run.sourceLabel ?? "—"}</td>
                    <td>
                      {summarizeCounts(
                        run.dryRun,
                        run.summary as Record<string, number | undefined>,
                      )}
                    </td>
                    <td>{run.errorCount}</td>
                    <td>
                      <Link
                        className={styles.linkButton}
                        href={importHistoryHref(query, {
                          selectedId: run.id,
                        })}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            {offset > 0 ? (
              <Link
                className={styles.secondaryButton}
                href={importHistoryHref(query, {
                  offset: Math.max(0, offset - limit),
                })}
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            {offset + limit < total ? (
              <Link
                className={styles.secondaryButton}
                href={importHistoryHref(query, { offset: offset + limit })}
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      ) : null}

      {query.selectedId ? (
        <div className={styles.detailBlock}>
          <h3 className={styles.panelTitle}>Run detail</h3>
          {detailError ? (
            <div className={styles.errorBox} role="alert">
              {detailError}
            </div>
          ) : null}
          {detail ? (
            <>
              <dl className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <dt>Run id</dt>
                  <dd>
                    <code>{detail.id}</code>
                  </dd>
                </div>
                <div className={styles.metaItem}>
                  <dt>Status</dt>
                  <dd>{importRunStatusLabel(detail.status, detail.dryRun)}</dd>
                </div>
                <div className={styles.metaItem}>
                  <dt>Source</dt>
                  <dd>{detail.sourceLabel ?? "—"}</dd>
                </div>
                <div className={styles.metaItem}>
                  <dt>Error count</dt>
                  <dd>{detail.errorCount}</dd>
                </div>
              </dl>
              <p className={styles.hint}>
                {summarizeCounts(
                  detail.dryRun,
                  detail.summary as Record<string, number | undefined>,
                )}
              </p>
              {detail.errors.length > 0 ? (
                <ul className={styles.list}>
                  {detail.errors.map((err, index) => (
                    <li key={`${err.path ?? "e"}-${index}`}>
                      {err.path ? <code>{err.path}</code> : null}
                      {err.path ? ": " : null}
                      {err.message ?? "Unknown error"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.muted}>No stored errors for this run.</p>
              )}
              <p className={styles.hint}>
                Original import JSON is not stored on the server. Audit trail
                (administrators):{" "}
                <code>
                  GET /v1/admin/audit-events?entityType=import_run&amp;entityId=
                  {detail.id}
                </code>
              </p>
            </>
          ) : null}
          <p className={styles.hint}>
            <Link href={importHistoryHref(query, { selectedId: undefined })}>
              Close detail
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
