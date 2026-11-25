import Link from "next/link";
import type { PlacePublic } from "@helm/api-client-ts";
import {
  formatTagLabel,
  pickPrimaryCopy,
  type DestinationDetailFields,
} from "@/lib/destinations/present";
import { formatCountryLabel } from "@/lib/geo/country-label";
import { DestinationPlaces } from "./DestinationPlaces";

type DestinationDetailProps = {
  destination: DestinationDetailFields;
  places?: PlacePublic[];
  placesError?: string | null;
  placesPage?: number;
  placesPageSize?: number;
  placesTotal?: number;
  locale?: string;
};

export function DestinationDetail({
  destination,
  places = [],
  placesError = null,
  placesPage = 1,
  placesPageSize = 50,
  placesTotal = 0,
  locale = "en",
}: DestinationDetailProps) {
  const { summary, description } = pickPrimaryCopy(destination);
  const tags = destination.tags ?? [];
  const arabicSummary = destination.summaryAr?.trim();
  const countryLabel = formatCountryLabel(destination.countryCode, locale);

  return (
    <main className="shell">
      <Link href="/" className="back-link">
        ← Discover
      </Link>

      <header className="detail-hero">
        <h1 className="detail-title">{destination.nameEn}</h1>
        {destination.nameAr ? (
          <p className="detail-title-ar" lang="ar" dir="rtl">{destination.nameAr}</p>
        ) : null}
        <p className="detail-country">{countryLabel}</p>
      </header>

      {summary ? <p className="detail-copy">{summary}</p> : null}
      {description ? <p className="detail-copy">{description}</p> : null}
      {!summary && !description ? (
        <p className="detail-empty">
          A longer description is not available for this destination yet.
        </p>
      ) : null}

      {arabicSummary ? (
        <p className="detail-copy" dir="rtl" lang="ar">
          {arabicSummary}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <div className="tag-row" aria-label="Destination tags">
          {tags.map((tag) => (
            <span className="tag" key={tag}>
              {formatTagLabel(tag)}
            </span>
          ))}
        </div>
      ) : null}

      <DestinationPlaces
        places={places}
        destinationSlug={destination.slug}
        errorMessage={placesError}
        page={placesPage}
        pageSize={placesPageSize}
        total={placesTotal}
      />
    </main>
  );
}
