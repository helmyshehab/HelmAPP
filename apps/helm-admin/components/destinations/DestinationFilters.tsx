import type { GeoCountryListResponse, LifecycleStatus } from "@helm/api-client-ts";
import { LIFECYCLE_STATUSES } from "../../lib/destinations/lifecycle-ui";
import type { DestinationListQuery } from "../../lib/destinations/query";
import { DEFAULT_PAGE_SIZE } from "../../lib/destinations/query";
import styles from "./destinations.module.css";

type DestinationFiltersProps = {
  query: DestinationListQuery;
  countries: GeoCountryListResponse["items"];
};

export function DestinationFilters({
  query,
  countries,
}: DestinationFiltersProps) {
  return (
    <form className={styles.filters} method="get" action="/destinations">
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
        <span>Lifecycle</span>
        <select
          className={styles.select}
          name="lifecycleStatus"
          defaultValue={query.lifecycleStatus ?? ""}
        >
          <option value="">All statuses</option>
          {LIFECYCLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {(status as LifecycleStatus).replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>Country</span>
        <select
          className={styles.select}
          name="country"
          defaultValue={query.country ?? ""}
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.nameEn} ({country.code})
            </option>
          ))}
        </select>
      </label>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          name="featured"
          value="true"
          defaultChecked={query.featured === true}
        />
        <span>Featured only</span>
      </label>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          name="topLevelOnly"
          value="true"
          defaultChecked={query.topLevelOnly === true}
        />
        <span>Top-level only</span>
      </label>
      <input type="hidden" name="limit" value={String(DEFAULT_PAGE_SIZE)} />
      <button className={styles.button} type="submit">
        Apply filters
      </button>
    </form>
  );
}
