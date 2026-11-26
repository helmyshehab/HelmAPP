"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PackageAdmin } from "@helm/api-client-ts";
import {
  publishPackageAction,
  unpublishPackageAction,
  updatePackageAction,
} from "../../app/actions/packages";
import {
  amenityOptions,
  hotelOptions,
  parseEditableContent,
  syncDaysToNights,
  type EditablePackageContent,
  defaultUbudPackageContent,
} from "../../lib/packages/ubud-content";
import styles from "../destinations/destinations.module.css";

type PlaceOption = { slug: string; nameEn: string; category: string };

type PackageEditorProps = {
  pkg: PackageAdmin;
  places: PlaceOption[];
};

export function PackageEditor({ pkg, places }: PackageEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState(pkg.titleEn);
  const [titleAr, setTitleAr] = useState(pkg.titleAr);
  const [summaryEn, setSummaryEn] = useState(pkg.summaryEn ?? "");
  const [summaryAr, setSummaryAr] = useState(pkg.summaryAr ?? "");
  const [content, setContent] = useState<EditablePackageContent>(
    () =>
      parseEditableContent(pkg.content) ??
      (JSON.parse(JSON.stringify(defaultUbudPackageContent)) as EditablePackageContent),
  );
  const published = pkg.publishStatus === "published";
  const stopChoices = useMemo(
    () => places.filter((place) => place.category !== "accommodation"),
    [places],
  );

  function patchContent(next: EditablePackageContent) {
    setContent(next);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updatePackageAction(pkg.id, {
        titleEn,
        titleAr,
        summaryEn: summaryEn || null,
        summaryAr: summaryAr || null,
        content,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function unpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishPackageAction(pkg.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function publish() {
    setError(null);
    startTransition(async () => {
      const result = await publishPackageAction(pkg.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <p className={styles.subtitle}>
        Status: <strong>{pkg.publishStatus}</strong>
        {published
          ? " — unpublish before editing trip settings or days."
          : " — edit, preview, then publish for travelers."}
      </p>
      {error ? (
        <p role="alert" className={styles.errorBox}>
          {error}
        </p>
      ) : null}

      <section>
        <h2 className={styles.title}>1. Trip settings</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Title (EN)</span>
            <input
              className={styles.input}
              value={titleEn}
              disabled={published || pending}
              onChange={(event) => setTitleEn(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Title (AR)</span>
            <input
              className={styles.input}
              value={titleAr}
              disabled={published || pending}
              onChange={(event) => setTitleAr(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Summary (EN)</span>
            <textarea
              className={styles.input}
              rows={3}
              value={summaryEn}
              disabled={published || pending}
              onChange={(event) => setSummaryEn(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Budget (EGP)</span>
            <input
              className={styles.input}
              type="number"
              value={content.answers.budgetEgp}
              disabled={published || pending}
              onChange={(event) =>
                patchContent({
                  ...content,
                  answers: {
                    ...content.answers,
                    budgetEgp: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>Travelers</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={20}
              value={content.answers.travelerCount}
              disabled={published || pending}
              onChange={(event) =>
                patchContent({
                  ...content,
                  answers: {
                    ...content.answers,
                    travelerCount: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>Nights (sets day count)</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={14}
              value={content.answers.nights}
              disabled={published || pending}
              onChange={(event) =>
                patchContent(
                  syncDaysToNights(content, Number(event.target.value)),
                )
              }
            />
          </label>
          <label className={styles.field}>
            <span>Lifestyle</span>
            <select
              className={styles.input}
              value={content.answers.lifestyle}
              disabled={published || pending}
              onChange={(event) =>
                patchContent({
                  ...content,
                  answers: {
                    ...content.answers,
                    lifestyle: event.target.value as EditablePackageContent["answers"]["lifestyle"],
                  },
                })
              }
            >
              <option value="culture">culture</option>
              <option value="adventure">adventure</option>
              <option value="food">food</option>
              <option value="relaxed">relaxed</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Flight</span>
            <select
              className={styles.input}
              value={content.selections.flightId}
              disabled={published || pending}
              onChange={(event) =>
                patchContent({
                  ...content,
                  selections: {
                    ...content.selections,
                    flightId: event.target.value as EditablePackageContent["selections"]["flightId"],
                  },
                })
              }
            >
              <option value="economy-example">economy-example</option>
              <option value="flexible-example">flexible-example</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Hotel</span>
            <select
              className={styles.input}
              value={content.selections.hotelSlug}
              disabled={published || pending}
              onChange={(event) =>
                patchContent({
                  ...content,
                  selections: {
                    ...content.selections,
                    hotelSlug: event.target.value,
                  },
                })
              }
            >
              {hotelOptions.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className={styles.field}>
          <legend>Amenities</legend>
          {amenityOptions.map((amenity) => {
            const checked = content.answers.amenities.includes(amenity);
            return (
              <label key={amenity} className={styles.field}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={published || pending}
                  onChange={() => {
                    const amenities = checked
                      ? content.answers.amenities.filter((item) => item !== amenity)
                      : [...content.answers.amenities, amenity];
                    patchContent({
                      ...content,
                      answers: { ...content.answers, amenities },
                    });
                  }}
                />{" "}
                {amenity}
              </label>
            );
          })}
        </fieldset>
      </section>

      <section>
        <h2 className={styles.title}>2. Days</h2>
        <p className={styles.subtitle}>
          Choose ordered published Ubud places per day. Included activities must appear in the
          itinerary before publish.
        </p>
        {content.itinerary.days.map((day, dayIndex) => (
          <div key={day.dayNumber}>
            <h3>Day {day.dayNumber}</h3>
            <label className={styles.field}>
              <span>Add stop</span>
              <select
                className={styles.input}
                disabled={published || pending}
                defaultValue=""
                onChange={(event) => {
                  const slug = event.target.value;
                  if (!slug) return;
                  const days = content.itinerary.days.map((item, index) =>
                    index === dayIndex
                      ? { ...item, stopSlugs: [...item.stopSlugs, slug] }
                      : item,
                  );
                  patchContent({ ...content, itinerary: { days } });
                  event.target.value = "";
                }}
              >
                <option value="">Select published place</option>
                {stopChoices.map((place) => (
                  <option key={place.slug} value={place.slug}>
                    {place.nameEn} ({place.slug})
                  </option>
                ))}
              </select>
            </label>
            <ul>
              {day.stopSlugs.map((slug, stopIndex) => (
                <li key={`${day.dayNumber}-${slug}-${stopIndex}`}>
                  {slug}{" "}
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={published || pending}
                    onClick={() => {
                      const days = content.itinerary.days.map((item, index) =>
                        index === dayIndex
                          ? {
                              ...item,
                              stopSlugs: item.stopSlugs.filter((_, i) => i !== stopIndex),
                            }
                          : item,
                      );
                      patchContent({ ...content, itinerary: { days } });
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <fieldset className={styles.field}>
          <legend>Included priced activities</legend>
          {Array.from(
            new Set(content.itinerary.days.flatMap((day) => day.stopSlugs)),
          ).map((slug) => {
            const checked = content.selections.includedActivitySlugs.includes(slug);
            return (
              <label key={slug} className={styles.field}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={published || pending}
                  onChange={() => {
                    const included = checked
                      ? content.selections.includedActivitySlugs.filter((item) => item !== slug)
                      : [...content.selections.includedActivitySlugs, slug];
                    patchContent({
                      ...content,
                      selections: {
                        ...content.selections,
                        includedActivitySlugs: included,
                      },
                    });
                  }}
                />{" "}
                {slug}
              </label>
            );
          })}
        </fieldset>
      </section>

      <section>
        <h2 className={styles.title}>3. Preview</h2>
        <p className={styles.subtitle}>
          Travelers will see <strong>{titleEn}</strong> ({content.answers.nights} nights,{" "}
          {content.answers.travelerCount} travelers, {content.answers.budgetEgp.toLocaleString()}{" "}
          EGP) with hotel <code>{content.selections.hotelSlug}</code>.
        </p>
        <ol>
          {content.itinerary.days.map((day) => (
            <li key={day.dayNumber}>
              Day {day.dayNumber}: {day.stopSlugs.join(", ") || "(no stops)"}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className={styles.title}>4. Publish</h2>
        <div className={styles.actionsRow}>
          {published ? (
            <button
              type="button"
              className={styles.button}
              disabled={pending}
              onClick={unpublish}
            >
              Unpublish to edit
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.button}
                disabled={pending}
                onClick={save}
              >
                Save draft content
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={pending}
                onClick={publish}
              >
                Publish
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
