"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deletePackageCoverAction,
  updatePackageCoverAltAction,
  uploadPackageCoverAction,
} from "../../app/actions/packages";
import {
  COVER_ACCEPT,
  validateAltTextAr,
  validateAltTextEn,
  validateCoverFile,
} from "../../lib/destinations/cover";
import { canStartMutation } from "../../lib/destinations/edit-save";
import type { PackageCoverView } from "../../lib/packages/cover";
import styles from "../destinations/destinations.module.css";

type PackageCoverPanelProps = {
  packageId: string;
  isAdmin: boolean;
  initialCover: PackageCoverView | null;
};

export function PackageCoverPanel({
  packageId,
  isAdmin,
  initialCover,
}: PackageCoverPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altTextEn, setAltTextEn] = useState(initialCover?.altTextEn ?? "");
  const [altTextAr, setAltTextAr] = useState(initialCover?.altTextAr ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAltTextEn(initialCover?.altTextEn ?? "");
    setAltTextAr(initialCover?.altTextAr ?? "");
    setImageBroken(false);
  }, [
    initialCover?.mediaId,
    initialCover?.altTextEn,
    initialCover?.altTextAr,
    initialCover?.url,
  ]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  function clearPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onSelectFile(next: File | null) {
    setError(null);
    setSuccess(null);
    const validation = validateCoverFile(next);
    if (validation) {
      clearPreview();
      setError(validation);
      return;
    }
    if (!next) {
      clearPreview();
      return;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const url = URL.createObjectURL(next);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFile(next);
    setImageBroken(false);
  }

  function displayedUrl(): string | null {
    if (previewUrl) return previewUrl;
    if (imageBroken) return null;
    return initialCover?.url ?? null;
  }

  function runUpload() {
    if (!canStartMutation(pending) || !isAdmin) return;
    const fileError = validateCoverFile(file);
    if (fileError || !file) {
      setError(fileError ?? "Choose a cover image to upload.");
      return;
    }
    const altEnError = validateAltTextEn(altTextEn);
    if (altEnError) {
      setError(altEnError);
      return;
    }
    const altArError = validateAltTextAr(altTextAr);
    if (altArError) {
      setError(altArError);
      return;
    }

    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("altTextEn", altTextEn.trim());
    if (altTextAr.trim()) {
      formData.set("altTextAr", altTextAr.trim());
    }

    startTransition(async () => {
      const result = await uploadPackageCoverAction(packageId, formData);
      if (!result.ok) {
        clearPreview();
        setError(result.message);
        return;
      }
      clearPreview();
      setSuccess(
        initialCover ? "Cover image replaced." : "Cover image uploaded.",
      );
      router.refresh();
    });
  }

  function runSaveAlt() {
    if (!canStartMutation(pending) || !isAdmin) return;
    if (!initialCover) {
      setError("Upload a cover image before saving alt text alone.");
      return;
    }
    const altEnError = validateAltTextEn(altTextEn);
    if (altEnError) {
      setError(altEnError);
      return;
    }
    const altArError = validateAltTextAr(altTextAr);
    if (altArError) {
      setError(altArError);
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updatePackageCoverAltAction(packageId, {
        altTextEn: altTextEn.trim(),
        altTextAr: altTextAr.trim() ? altTextAr.trim() : null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess("Cover alt text saved.");
      router.refresh();
    });
  }

  function runRemove() {
    if (!canStartMutation(pending) || !isAdmin || !initialCover) return;
    const ok = window.confirm(
      "Remove this package cover? Traveler Packages will hide the image for this package.",
    );
    if (!ok) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deletePackageCoverAction(packageId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      clearPreview();
      setAltTextEn("");
      setAltTextAr("");
      setSuccess("Cover removed.");
      router.refresh();
    });
  }

  const busy = pending;
  const url = displayedUrl();
  const hasSavedCover = Boolean(initialCover);

  return (
    <section className={styles.formSection}>
      <h2 className={styles.formSectionTitle}>Cover image</h2>
      <p className={styles.muted}>
        Public package thumbnail for traveler Packages. JPEG, PNG, or WebP up to
        5 MiB. English alt text is required. Publish status is unchanged by cover
        edits.
      </p>

      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.coverPreview}
          src={url}
          alt={altTextEn.trim() || "Package cover preview"}
          onError={() => {
            if (!previewUrl) setImageBroken(true);
          }}
        />
      ) : (
        <p className={styles.muted}>
          {hasSavedCover
            ? "Cover is linked but the image URL could not be loaded."
            : "No cover image yet."}
        </p>
      )}

      {error ? (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className={styles.successBox} role="status">
          {success}
        </div>
      ) : null}

      {!isAdmin ? (
        <div className={styles.formGrid}>
          <p className={styles.muted}>
            Operators can view covers. Upload, replace, alt edits, and removal
            require an administrator.
          </p>
          {hasSavedCover ? (
            <dl className={styles.metaList}>
              <div>
                <dt>
                  <strong>Alt (EN)</strong>
                </dt>
                <dd>{initialCover?.altTextEn || "—"}</dd>
              </div>
              <div>
                <dt>
                  <strong>Alt (AR)</strong>
                </dt>
                <dd>{initialCover?.altTextAr || "—"}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : (
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>{hasSavedCover ? "Replace image" : "Upload image"}</span>
            <input
              ref={fileInputRef}
              className={styles.input}
              type="file"
              accept={COVER_ACCEPT}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                onSelectFile(next);
              }}
            />
          </label>

          <label className={styles.field}>
            <span>Alt text (EN) *</span>
            <input
              className={styles.input}
              value={altTextEn}
              disabled={busy}
              maxLength={500}
              onChange={(event) => setAltTextEn(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Alt text (AR)</span>
            <input
              className={styles.input}
              value={altTextAr}
              disabled={busy}
              maxLength={500}
              dir="auto"
              onChange={(event) => setAltTextAr(event.target.value)}
            />
          </label>

          <div className={styles.coverActions}>
            <button
              type="button"
              className={styles.button}
              disabled={busy || !file}
              onClick={runUpload}
            >
              {busy && file
                ? "Saving cover…"
                : hasSavedCover
                  ? "Replace cover"
                  : "Upload cover"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy || !hasSavedCover || Boolean(file)}
              onClick={runSaveAlt}
              title={
                file
                  ? "Clear the staged file to save alt text only"
                  : undefined
              }
            >
              {busy && !file ? "Saving alt…" : "Save alt text"}
            </button>
            {file ? (
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={busy}
                onClick={() => {
                  clearPreview();
                  setError(null);
                }}
              >
                Cancel file
              </button>
            ) : null}
            <button
              type="button"
              className={styles.dangerButton}
              disabled={busy || !hasSavedCover}
              onClick={runRemove}
            >
              Remove cover
            </button>
          </div>
        </div>
      )}
    </section>
  );
}