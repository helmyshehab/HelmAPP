import Link from "next/link";
import {
  buildPlaceListHref,
  type PlaceListQuery,
} from "../../lib/places/query";
import styles from "../destinations/destinations.module.css";

type PlacePaginationProps = {
  query: PlaceListQuery;
  total: number;
};

export function PlacePagination({ query, total }: PlacePaginationProps) {
  const { limit, offset } = query;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const prevOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < total;

  return (
    <div className={styles.pagination}>
      <p className={styles.muted}>
        Showing {from}–{to} of {total}
      </p>
      <div className={styles.actionsRow}>
        {hasPrev ? (
          <Link
            className={styles.secondaryButton}
            href={buildPlaceListHref(query, { offset: prevOffset })}
          >
            Previous
          </Link>
        ) : (
          <span className={styles.secondaryButton} aria-disabled="true">
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            className={styles.secondaryButton}
            href={buildPlaceListHref(query, { offset: nextOffset })}
          >
            Next
          </Link>
        ) : (
          <span className={styles.secondaryButton} aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
