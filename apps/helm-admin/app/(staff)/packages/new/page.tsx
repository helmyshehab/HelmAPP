"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPackageAction } from "../../../actions/packages";
import { defaultUbudPackageContent } from "../../../../lib/packages/ubud-content";
import styles from "../../../../components/destinations/destinations.module.css";

/** Staging/local Ubud destination id is environment-specific; staff pastes it. */
export default function NewPackagePage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState("");
  const [slug, setSlug] = useState("ubud-culture-escape");
  const [titleEn, setTitleEn] = useState("Ubud culture escape");
  const [titleAr, setTitleAr] = useState("أوبود — رحلة ثقافية");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPackageAction({
        destinationId,
        slug,
        titleEn,
        titleAr,
        summaryEn:
          "Three nights in central Ubud with Sacred Monkey Forest and Moksa.",
        summaryAr: "ثلاث ليالٍ في أوبود مع غابة القرود وموكسا.",
        content: structuredClone(defaultUbudPackageContent),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/packages/${result.package.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Packages</p>
          <h1 className={styles.title}>New Ubud package</h1>
          <p className={styles.subtitle}>
            Creates an unpublished package with default Build-compatible content. Paste the
            published Ubud destination UUID from Destinations.
          </p>
        </div>
      </header>
      <form className={styles.stack} onSubmit={onSubmit}>
        {error ? (
          <p role="alert" className={styles.errorBox}>
            {error}
          </p>
        ) : null}
        <label className={styles.field}>
          <span>Ubud destination ID</span>
          <input
            className={styles.input}
            required
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
            placeholder="uuid"
          />
        </label>
        <label className={styles.field}>
          <span>Slug</span>
          <input
            className={styles.input}
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Title (EN)</span>
          <input
            className={styles.input}
            required
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Title (AR)</span>
          <input
            className={styles.input}
            required
            value={titleAr}
            onChange={(event) => setTitleAr(event.target.value)}
          />
        </label>
        <div className={styles.actionsRow}>
          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create unpublished package"}
          </button>
        </div>
      </form>
    </>
  );
}
