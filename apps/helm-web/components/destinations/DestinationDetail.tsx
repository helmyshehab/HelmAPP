import Link from "next/link";
import {
  formatTagLabel,
  pickPrimaryCopy,
  type DestinationDetailFields,
} from "@/lib/destinations/present";
import { formatCountryLabel } from "@/lib/geo/country-label";

type DestinationDetailProps = {
  destination: DestinationDetailFields;
  locale?: string;
};

export function DestinationDetail({
  destination,
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
          <p className="detail-title-ar">{destination.nameAr}</p>
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
    </main>
  );
}
