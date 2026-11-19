import type { PlaceListQuery } from "../../lib/places/query";
import { DEFAULT_PAGE_SIZE } from "../../lib/places/query";
import styles from "../destinations/destinations.module.css";

const CATEGORY_OPTIONS = [
  "accommodation",
  "dining",
  "attraction",
  "activity",
  "nightlife",
  "transport",
] as const;

type PlaceFiltersProps = {
  query: PlaceListQuery;
};

export function PlaceFilters({ query }: PlaceFiltersProps) {
  return (
    <form className={styles.filters} method="get" action="/places">
      <label className={styles.field}>
        <span>Search</span>
        <input
          className={styles.input}
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Name or slug"
        />
      </label>
      <label className={styles.field}>
        <span>Category</span>
        <select
          className={styles.select}
          name="category"
          defaultValue={query.category ?? ""}
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="limit" value={String(DEFAULT_PAGE_SIZE)} />
      <button className={styles.button} type="submit">
        Apply filters
      </button>
    </form>
  );
}
