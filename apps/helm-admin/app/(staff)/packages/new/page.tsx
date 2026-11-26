"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPackageAction } from "../../../actions/packages";
import { defaultUbudPackageContent } from "../../../../lib/packages/ubud-content";
import { defaultIstanbulPackageContent } from "../../../../lib/packages/istanbul-content";
import styles from "../../../../components/destinations/destinations.module.css";

type Template = "ubud" | "istanbul";

const templates: Record<
  Template,
  {
    label: string;
    slug: string;
    titleEn: string;
    titleAr: string;
    summaryEn: string;
    summaryAr: string;
    destinationLabel: string;
    content: Record<string, unknown>;
  }
> = {
  ubud: {
    label: "Ubud (legacy ubud_trip_preview)",
    slug: "ubud-culture-escape",
    titleEn: "Ubud culture escape",
    titleAr: "أوبود — رحلة ثقافية",
    summaryEn: "Three nights in central Ubud with Sacred Monkey Forest and Moksa.",
    summaryAr: "ثلاث ليالٍ في أوبود مع غابة القرود وموكسا.",
    destinationLabel: "Ubud destination ID",
    content: structuredClone(defaultUbudPackageContent) as Record<string, unknown>,
  },
  istanbul: {
    label: "Istanbul (trip_preview)",
    slug: "istanbul-bosphorus-escape",
    titleEn: "Istanbul Bosphorus escape",
    titleAr: "إسطنبول — رحلة البوسفور",
    summaryEn: "Three nights with Hagia Sophia and the Grand Bazaar.",
    summaryAr: "ثلاث ليالٍ مع آيا صوفيا والبازار الكبير.",
    destinationLabel: "Istanbul destination ID",
    content: structuredClone(defaultIstanbulPackageContent) as Record<string, unknown>,
  },
};

/** Destination UUID is environment-specific; staff pastes it from Destinations. */
export default function NewPackagePage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template>("istanbul");
  const [destinationId, setDestinationId] = useState("");
  const defaults = templates[template];
  const [slug, setSlug] = useState(defaults.slug);
  const [titleEn, setTitleEn] = useState(defaults.titleEn);
  const [titleAr, setTitleAr] = useState(defaults.titleAr);

  function onTemplateChange(next: Template) {
    const values = templates[next];
    setTemplate(next);
    setSlug(values.slug);
    setTitleEn(values.titleEn);
    setTitleAr(values.titleAr);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const values = templates[template];
    startTransition(async () => {
      const result = await createPackageAction({
        destinationId,
        slug,
        titleEn,
        titleAr,
        summaryEn: values.summaryEn,
        summaryAr: values.summaryAr,
        content: structuredClone(values.content),
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
          <h1 className={styles.title}>New package</h1>
          <p className={styles.subtitle}>
            Creates an unpublished Build-compatible package. Paste the published destination UUID
            from Destinations. Istanbul uses shared trip_preview v1; Ubud keeps legacy
            ubud_trip_preview for existing drafts.
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
          <span>Template</span>
          <select
            className={styles.input}
            value={template}
            onChange={(event) => onTemplateChange(event.target.value as Template)}
          >
            <option value="istanbul">{templates.istanbul.label}</option>
            <option value="ubud">{templates.ubud.label}</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{templates[template].destinationLabel}</span>
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
