import Link from "next/link";
import type { DestinationPublic } from "@helm/api-client-ts";
import { formatTagLabel } from "@/lib/destinations/present";
import { formatCountryLabel } from "@/lib/geo/country-label";

type DestinationCardProps = {
  destination: DestinationPublic;
  locale?: string;
  lead?: boolean;
  span?: boolean;
};

export function DestinationCard({
  destination,
  locale = "en",
  lead = false,
  span = false,
}: DestinationCardProps) {
  const featured = destination.isFeatured === true;
  const tags = (destination.tags ?? []).slice(0, 3);
  const summary = destination.summaryEn?.trim();
  const arabicName = destination.nameAr?.trim();
  const countryLabel = formatCountryLabel(destination.countryCode, locale);

  return (
    <li
      className={[
        "destination-item",
        lead ? "destination-item-lead" : "",
        span ? "destination-item-span" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        href={`/destinations/${encodeURIComponent(destination.slug)}`}
        className="destination-link"
        data-featured={featured ? "true" : "false"}
        data-lead={lead ? "true" : "false"}
        data-span={span ? "true" : "false"}
      >
        <div className="destination-identity">
          {featured ? <span className="featured-chip">Featured</span> : null}
          <h3 className="destination-name">{destination.nameEn}</h3>
          {arabicName ? (
            <p className="destination-name-ar" lang="ar" dir="rtl">
              {arabicName}
            </p>
          ) : null}
          {countryLabel ? (
            <p className="destination-meta">{countryLabel}</p>
          ) : null}
        </div>
        {summary || tags.length > 0 ? (
          <div className="destination-aside">
            {summary ? <p className="destination-summary">{summary}</p> : null}
            {tags.length > 0 ? (
              <div className="tag-row" aria-label="Tags">
                {tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {formatTagLabel(tag)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Link>
    </li>
  );
}
