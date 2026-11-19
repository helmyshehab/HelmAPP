"use client";

import styles from "./destinations.module.css";

export type TagOption = {
  slug: string;
  nameEn: string;
  nameAr: string;
};

type TagsEditorProps = {
  options: TagOption[];
  value: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
};

export function TagsEditor({
  options,
  value,
  disabled,
  onChange,
}: TagsEditorProps) {
  const selected = new Set(value);
  const available = options.filter((option) => !selected.has(option.slug));

  function addTag(slug: string) {
    if (!slug || selected.has(slug)) return;
    onChange([...value, slug]);
  }

  function removeTag(slug: string) {
    onChange(value.filter((item) => item !== slug));
  }

  return (
    <div className={styles.stack}>
      <div className={styles.tagList} aria-label="Selected tags">
        {value.length === 0 ? (
          <span className={styles.muted}>No tags selected.</span>
        ) : (
          value.map((slug) => {
            const meta = options.find((option) => option.slug === slug);
            return (
              <span key={slug} className={styles.tagChip}>
                {meta?.nameEn ?? slug}
                {!disabled ? (
                  <button
                    type="button"
                    aria-label={`Remove ${slug}`}
                    onClick={() => removeTag(slug)}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
          })
        )}
      </div>
      <label className={styles.field}>
        <span>Add tag</span>
        <select
          className={styles.select}
          disabled={disabled || available.length === 0}
          defaultValue=""
          onChange={(event) => {
            addTag(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">
            {available.length === 0 ? "No more tags" : "Select a tag"}
          </option>
          {available.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.nameEn} ({option.slug})
            </option>
          ))}
        </select>
      </label>
      <p className={styles.muted}>
        Saving replaces the full tag set (PUT). An empty set clears all tags.
      </p>
    </div>
  );
}
