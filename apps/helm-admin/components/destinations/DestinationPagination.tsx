import Link from "next/link";
import {
  buildDestinationListHref,
  type DestinationListQuery,
} from "../../lib/destinations/query";
import styles from "./destinations.module.css";

type DestinationPaginationProps = {
  query: DestinationListQuery;
  total: number;
};

export function DestinationPagination({
  query,
  total,
}: DestinationPaginationProps) {
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
            href={buildDestinationListHref(query, { offset: prevOffset })}
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
            href={buildDestinationListHref(query, { offset: nextOffset })}
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
