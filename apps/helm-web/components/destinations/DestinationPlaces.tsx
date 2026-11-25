import Link from "next/link";
import type { PlacePublic } from "@helm/api-client-ts";

export type DestinationPlacesProps = {
  places: PlacePublic[];
  destinationSlug: string;
  errorMessage?: string | null;
  page?: number;
  pageSize?: number;
  total?: number;
};

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

function placeDescription(place: PlacePublic): string | null {
  const short = place.shortDescriptionEn?.trim();
  return short ? short : null;
}

function placesPageHref(slug: string, page: number): string {
  const base = `/destinations/${encodeURIComponent(slug)}`;
  if (page <= 1) return base;
  return `${base}?page=${page}`;
}

export function DestinationPlaces({
  places,
  destinationSlug,
  errorMessage = null,
  page = 1,
  pageSize = 50,
  total = 0,
}: DestinationPlacesProps) {
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const showPagination = !errorMessage && total > pageSize;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <section className="places-section" aria-labelledby="places-heading">
      <h2 id="places-heading" className="section-label">
        Places
      </h2>

      {errorMessage ? (
        <p className="places-status" role="status">
          {errorMessage}
        </p>
      ) : null}

      {!errorMessage && places.length === 0 ? (
        <p className="places-status">
          No published places are listed for this destination yet.
        </p>
      ) : null}

      {places.length > 0 ? (
        <ul className="place-list">
          {places.map((place) => {
            const description = placeDescription(place);
            return (
              <li key={place.id} className="place-item">
                <p className="place-name">{place.nameEn}</p>
                {place.nameAr ? (
                  <p className="place-name-ar" lang="ar" dir="rtl">{place.nameAr}</p>
                ) : null}
                <p className="place-meta">{formatCategory(place.category)}</p>
                {description ? (
                  <p className="place-summary">{description}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showPagination ? (
        <nav className="places-pagination" aria-label="Places pages">
          <p className="places-pagination-status">
            Page {page} of {totalPages}
          </p>
          <div className="places-pagination-links">
            {hasPrev ? (
              <Link
                className="places-pagination-link"
                href={placesPageHref(destinationSlug, page - 1)}
                rel="prev"
              >
                Previous
              </Link>
            ) : null}
            {hasNext ? (
              <Link
                className="places-pagination-link"
                href={placesPageHref(destinationSlug, page + 1)}
                rel="next"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </section>
  );
}
