"use client";

import { useState, useTransition } from "react";
import type { CatalogImportResult } from "@helm/api-client-ts";
import {
  applyImportAction,
  dryRunImportAction,
} from "../../app/actions/import";
import {
  parseImportPayloadJson,
  payloadFingerprint,
  type ImportPayloadSummary,
} from "../../lib/import/payload-summary";
import { ImportResultPanel } from "./ImportResultPanel";
import styles from "./import.module.css";

type ImportWorkbenchProps = {
  canApply: boolean;
};

export function ImportWorkbench({ canApply }: ImportWorkbenchProps) {
  const [rawJson, setRawJson] = useState("");
  const [summary, setSummary] = useState<ImportPayloadSummary | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<CatalogImportResult | null>(null);
  const [dryRunFingerprint, setDryRunFingerprint] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function refreshLocalSummary(nextRaw: string) {
    setRawJson(nextRaw);
    setActionError(null);
    if (!nextRaw.trim()) {
      setSummary(null);
      setLocalError(null);
      return;
    }
    const parsed = parseImportPayloadJson(nextRaw);
    if (!parsed.ok) {
      setSummary(null);
      setLocalError(parsed.message);
      return;
    }
    setLocalError(null);
    setSummary(parsed.summary);
  }

  function onFileChange(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      refreshLocalSummary(text);
      setResult(null);
      setDryRunFingerprint(null);
    };
    reader.onerror = () => {
      setLocalError("Could not read the selected file.");
    };
    reader.readAsText(file);
  }

  function runDryRun() {
    setActionError(null);
    startTransition(async () => {
      const response = await dryRunImportAction(rawJson);
      if (!response.ok) {
        setActionError(response.message);
        setResult(null);
        setDryRunFingerprint(null);
        return;
      }
      setResult(response.result);
      setDryRunFingerprint(payloadFingerprint(rawJson));
    });
  }

  function runApply() {
    if (!canApply) return;
    const confirmed = window.confirm(
      "Apply this import to the catalog?\n\nRecords are created/updated as draft only. Partial application is possible if some rows fail. This cannot be undone from this screen.",
    );
    if (!confirmed) return;

    setActionError(null);
    startTransition(async () => {
      const response = await applyImportAction(
        rawJson,
        dryRunFingerprint ?? "",
      );
      if (!response.ok) {
        setActionError(response.message);
        return;
      }
      setResult(response.result);
      // Require a fresh dry-run before another apply (including same payload).
      setDryRunFingerprint(null);
    });
  }

  const applyEnabled =
    canApply &&
    !pending &&
    Boolean(dryRunFingerprint) &&
    dryRunFingerprint === payloadFingerprint(rawJson) &&
    !localError &&
    Boolean(summary);

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>New import</h2>
        <p className={styles.muted}>
          Upload or paste a <code>helm.catalog.import.v1</code> document. Dry-run
          is the default next step and does not mutate catalog rows.
          {canApply
            ? " Apply requires confirmation and administrator authorization (enforced by the API)."
            : " Your role can dry-run only; apply is restricted to administrators."}
        </p>

        <div className={styles.fileRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>JSON file</span>
            <input
              type="file"
              accept="application/json,.json"
              disabled={pending}
              onChange={(event) =>
                onFileChange(event.target.files?.[0] ?? null)
              }
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Import JSON</span>
          <textarea
            className={styles.textarea}
            value={rawJson}
            disabled={pending}
            spellCheck={false}
            aria-invalid={localError ? true : undefined}
            aria-describedby={localError ? "import-local-error" : undefined}
            onChange={(event) => {
              refreshLocalSummary(event.target.value);
              setResult(null);
              setDryRunFingerprint(null);
            }}
            placeholder='{ "formatVersion": "helm.catalog.import.v1", ... }'
          />
        </label>

        {localError ? (
          <div className={styles.errorBox} role="alert" id="import-local-error">
            {localError}
          </div>
        ) : null}

        {summary ? (
          <dl className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <dt>Format</dt>
              <dd>{summary.formatVersion}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Source label</dt>
              <dd>{summary.sourceLabel ?? "—"}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Destinations</dt>
              <dd>{summary.destinationCount}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Places</dt>
              <dd>{summary.placeCount}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Countries</dt>
              <dd>
                {summary.countries.length > 0
                  ? summary.countries.join(", ")
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        {summary && summary.destinations.length > 0 ? (
          <div className={styles.detailBlock}>
            <h3 className={styles.panelTitle}>Destinations in payload</h3>
            <ul className={styles.list}>
              {summary.destinations.map((dest) => (
                <li key={dest.slug}>
                  <strong>{dest.nameEn}</strong>{" "}
                  <span className={styles.muted}>
                    ({dest.slug}
                    {dest.countryCode ? ` · ${dest.countryCode}` : ""})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary && Object.keys(summary.categoryCounts).length > 0 ? (
          <div className={styles.detailBlock}>
            <h3 className={styles.panelTitle}>Category distribution</h3>
            <ul className={styles.list}>
              {Object.entries(summary.categoryCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, count]) => (
                  <li key={category}>
                    {category}: {count}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {actionError ? (
          <div className={styles.errorBox} role="alert">
            {actionError}
          </div>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={pending || Boolean(localError) || !summary}
            onClick={runDryRun}
          >
            {pending ? "Working…" : "Dry-run"}
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            disabled={!applyEnabled}
            onClick={runApply}
            title={
              canApply
                ? dryRunFingerprint
                  ? undefined
                  : "Run a dry-run on this payload first"
                : "Administrator authorization required"
            }
          >
            Apply import
          </button>
        </div>
        {!canApply ? (
          <p className={styles.hint}>
            Apply is hidden from the API for operator accounts. Dry-run remains
            available.
          </p>
        ) : null}
        {canApply && !dryRunFingerprint ? (
          <p className={styles.hint}>
            Apply stays disabled until a dry-run succeeds for the current JSON.
          </p>
        ) : null}
      </section>

      {result ? <ImportResultPanel result={result} /> : null}
    </div>
  );
}
