"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import type { DestinationAdmin, LifecycleStatus } from "@helm/api-client-ts";
import {
  createDestinationAction,
  listCitiesForCountryAction,
  listParentOptionsAction,
  replaceDestinationTagsAction,
  updateDestinationAction,
} from "../../app/actions/destinations";
import {
  emptyDestinationForm,
  validateCreateForm,
  validateUpdateForm,
  valuesFromDestination,
  type DestinationFormValues,
  type FieldErrors,
} from "../../lib/destinations/form-schema";
import {
  canEditDestinationFields,
  isPublishedSlugImmutable,
} from "../../lib/destinations/lifecycle-ui";
import { TagsEditor, type TagOption } from "./TagsEditor";
import styles from "./destinations.module.css";

type CountryOption = { code: string; nameEn: string };
type CityOption = { id: string; nameEn: string; countryCode: string };
type ParentOption = { id: string; nameEn: string; slug: string };

type DestinationFormProps = {
  mode: "create" | "edit";
  destination?: DestinationAdmin;
  isAdmin: boolean;
  countries: CountryOption[];
  tagOptions: TagOption[];
  initialCities?: CityOption[];
  initialParents?: ParentOption[];
};

export function DestinationForm({
  mode,
  destination,
  isAdmin,
  countries,
  tagOptions,
  initialCities = [],
  initialParents = [],
}: DestinationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<DestinationFormValues>(() =>
    destination
      ? valuesFromDestination(destination)
      : emptyDestinationForm(),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>(initialCities);
  const [parents, setParents] = useState<ParentOption[]>(initialParents);
  const [loadingCities, setLoadingCities] = useState(false);

  const status = (destination?.lifecycleStatus ?? "draft") as LifecycleStatus;
  const editable = mode === "create" || canEditDestinationFields(status, isAdmin);
  const slugLocked =
    mode === "edit" && isPublishedSlugImmutable(status);

  useEffect(() => {
    let cancelled = false;
    async function loadParents() {
      const result = await listParentOptionsAction({
        country: values.countryCode || undefined,
        excludeId: destination?.id,
      });
      if (cancelled || !result.ok) return;
      setParents(
        result.items.map((item) => ({
          id: item.id,
          nameEn: item.nameEn,
          slug: item.slug,
        })),
      );
    }
    void loadParents();
    return () => {
      cancelled = true;
    };
  }, [values.countryCode, destination?.id]);

  async function onCountryChange(countryCode: string) {
    setValues((prev) => ({
      ...prev,
      countryCode,
      cityId: "",
    }));
    if (!/^[A-Za-z]{2}$/.test(countryCode)) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    const result = await listCitiesForCountryAction(countryCode);
    setLoadingCities(false);
    if (!result.ok) {
      setFormError(result.message);
      setCities([]);
      return;
    }
    setCities(
      result.items.map((city) => ({
        id: city.id,
        nameEn: city.nameEn,
        countryCode: city.countryCode,
      })),
    );
  }

  function updateField<K extends keyof DestinationFormValues>(
    key: K,
    value: DestinationFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    setFieldErrors({});

    if (!editable) {
      setFormError("This destination cannot be edited in its current state.");
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const validated = validateCreateForm(values);
        if (!validated.ok) {
          setFieldErrors(validated.errors);
          return;
        }
        const result = await createDestinationAction(validated.body);
        if (!result.ok) {
          setFormError(result.message);
          return;
        }
        router.replace(`/destinations/${result.id}?created=1`);
        router.refresh();
        return;
      }

      if (!destination) return;
      const validated = validateUpdateForm(values, {
        includeSlug: !slugLocked,
      });
      if (!validated.ok) {
        setFieldErrors(validated.errors);
        return;
      }

      const updateResult = await updateDestinationAction(
        destination.id,
        validated.body,
      );
      if (!updateResult.ok) {
        setFormError(updateResult.message);
        return;
      }

      const tagsResult = await replaceDestinationTagsAction(
        destination.id,
        values.tagSlugs,
      );
      if (!tagsResult.ok) {
        setFormError(tagsResult.message);
        return;
      }

      setSuccess("Destination saved.");
      router.refresh();
    });
  }

  return (
    <form className={styles.formGrid} onSubmit={onSubmit} noValidate>
      {formError ? (
        <div className={styles.errorBox} role="alert">
          {formError}
        </div>
      ) : null}
      {success ? (
        <div className={styles.successBox} role="status">
          {success}
        </div>
      ) : null}
      {!editable ? (
        <div className={styles.infoBox} role="status">
          Operators can edit only draft, pending verification, or rejected
          destinations. Lifecycle actions may still be available below.
        </div>
      ) : null}

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Identity</h2>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Slug</span>
            <input
              className={styles.input}
              value={values.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              disabled={!editable || slugLocked || pending}
              required
            />
            {slugLocked ? (
              <p className={styles.muted}>
                Published slugs are immutable in Step 6.5.
              </p>
            ) : null}
            {fieldErrors.slug ? (
              <p className={styles.fieldError}>{fieldErrors.slug}</p>
            ) : null}
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={values.isFeatured}
              onChange={(e) => updateField("isFeatured", e.target.checked)}
              disabled={!editable || pending}
            />
            <span>Featured</span>
          </label>
        </div>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Name (EN)</span>
            <input
              className={styles.input}
              value={values.nameEn}
              onChange={(e) => updateField("nameEn", e.target.value)}
              disabled={!editable || pending}
              required
            />
            {fieldErrors.nameEn ? (
              <p className={styles.fieldError}>{fieldErrors.nameEn}</p>
            ) : null}
          </label>
          <label className={styles.field}>
            <span>Name (AR)</span>
            <input
              className={styles.input}
              value={values.nameAr}
              onChange={(e) => updateField("nameAr", e.target.value)}
              disabled={!editable || pending}
              required
              dir="rtl"
            />
            {fieldErrors.nameAr ? (
              <p className={styles.fieldError}>{fieldErrors.nameAr}</p>
            ) : null}
          </label>
        </div>
        <label className={styles.field}>
          <span>External key</span>
          <input
            className={styles.input}
            value={values.externalKey}
            onChange={(e) => updateField("externalKey", e.target.value)}
            disabled={!editable || pending}
          />
        </label>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Content</h2>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Short description (EN)</span>
            <textarea
              className={styles.textarea}
              value={values.shortDescriptionEn}
              onChange={(e) =>
                updateField("shortDescriptionEn", e.target.value)
              }
              disabled={!editable || pending}
            />
          </label>
          <label className={styles.field}>
            <span>Short description (AR)</span>
            <textarea
              className={styles.textarea}
              value={values.shortDescriptionAr}
              onChange={(e) =>
                updateField("shortDescriptionAr", e.target.value)
              }
              disabled={!editable || pending}
              dir="rtl"
            />
          </label>
        </div>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Summary (EN)</span>
            <textarea
              className={styles.textarea}
              value={values.summaryEn}
              onChange={(e) => updateField("summaryEn", e.target.value)}
              disabled={!editable || pending}
            />
          </label>
          <label className={styles.field}>
            <span>Summary (AR)</span>
            <textarea
              className={styles.textarea}
              value={values.summaryAr}
              onChange={(e) => updateField("summaryAr", e.target.value)}
              disabled={!editable || pending}
              dir="rtl"
            />
          </label>
        </div>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Description (EN)</span>
            <textarea
              className={styles.textarea}
              value={values.descriptionEn}
              onChange={(e) => updateField("descriptionEn", e.target.value)}
              disabled={!editable || pending}
            />
          </label>
          <label className={styles.field}>
            <span>Description (AR)</span>
            <textarea
              className={styles.textarea}
              value={values.descriptionAr}
              onChange={(e) => updateField("descriptionAr", e.target.value)}
              disabled={!editable || pending}
              dir="rtl"
            />
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Geography</h2>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Country</span>
            <select
              className={styles.select}
              value={values.countryCode}
              onChange={(e) => void onCountryChange(e.target.value)}
              disabled={!editable || pending}
              required
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.nameEn} ({country.code})
                </option>
              ))}
            </select>
            {fieldErrors.countryCode ? (
              <p className={styles.fieldError}>{fieldErrors.countryCode}</p>
            ) : null}
          </label>
          <label className={styles.field}>
            <span>City</span>
            <select
              className={styles.select}
              value={values.cityId}
              onChange={(e) => updateField("cityId", e.target.value)}
              disabled={!editable || pending || !values.countryCode || loadingCities}
            >
              <option value="">
                {loadingCities ? "Loading cities…" : "No city"}
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameEn}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span>Parent destination</span>
          <select
            className={styles.select}
            value={values.parentId}
            onChange={(e) => updateField("parentId", e.target.value)}
            disabled={!editable || pending}
          >
            <option value="">None (top-level)</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.nameEn} ({parent.slug})
              </option>
            ))}
          </select>
        </label>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Timezone</span>
            <input
              className={styles.input}
              value={values.timezone}
              onChange={(e) => updateField("timezone", e.target.value)}
              disabled={!editable || pending}
              placeholder="e.g. Asia/Jakarta"
            />
          </label>
          <label className={styles.field}>
            <span>Website</span>
            <input
              className={styles.input}
              value={values.websiteUrl}
              onChange={(e) => updateField("websiteUrl", e.target.value)}
              disabled={!editable || pending}
            />
            {fieldErrors.websiteUrl ? (
              <p className={styles.fieldError}>{fieldErrors.websiteUrl}</p>
            ) : null}
          </label>
        </div>
        <div className={styles.twoCol}>
          <label className={styles.field}>
            <span>Latitude</span>
            <input
              className={styles.input}
              value={values.latitude}
              onChange={(e) => updateField("latitude", e.target.value)}
              disabled={!editable || pending}
            />
            {fieldErrors.latitude ? (
              <p className={styles.fieldError}>{fieldErrors.latitude}</p>
            ) : null}
          </label>
          <label className={styles.field}>
            <span>Longitude</span>
            <input
              className={styles.input}
              value={values.longitude}
              onChange={(e) => updateField("longitude", e.target.value)}
              disabled={!editable || pending}
            />
            {fieldErrors.longitude ? (
              <p className={styles.fieldError}>{fieldErrors.longitude}</p>
            ) : null}
          </label>
        </div>
        <label className={styles.field}>
          <span>Address</span>
          <textarea
            className={styles.textarea}
            value={values.addressText}
            onChange={(e) => updateField("addressText", e.target.value)}
            disabled={!editable || pending}
          />
        </label>
      </section>

      <section className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Tags</h2>
        <TagsEditor
          options={tagOptions}
          value={values.tagSlugs}
          disabled={!editable || pending}
          onChange={(tagSlugs) => updateField("tagSlugs", tagSlugs)}
        />
        {mode === "create" ? (
          <p className={styles.muted}>
            Initial tags are sent with create. Later edits use PUT replace.
          </p>
        ) : null}
      </section>

      <div className={styles.actionsRow}>
        <button className={styles.button} type="submit" disabled={!editable || pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create draft"
              : "Save changes"}
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          disabled={pending}
          onClick={() => router.push("/destinations")}
        >
          Back to list
        </button>
      </div>
    </form>
  );
}
