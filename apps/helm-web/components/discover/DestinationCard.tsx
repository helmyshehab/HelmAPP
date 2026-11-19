import Link from "next/link";
import type { DestinationPublic } from "@helm/api-client-ts";
import {
  formatTagLabel,
  isFeaturedDemoDestination,
} from "@/lib/destinations/present";
import { formatCountryLabel } from "@/lib/geo/country-label";

type DestinationCardProps = {
  destination: DestinationPublic;
  locale?: string;
};

export function DestinationCard({
  destination,
  locale = "en",
}: DestinationCardProps) {
  const featured = isFeaturedDemoDestination(destination.slug);
  const tags = (destination.tags ?? []).slice(0, featured ? 6 : 4);
  const summary = destination.summaryEn?.trim();
  const countryLabel = formatCountryLabel(destination.countryCode, locale);

  return (
    <li>
      <Link
        href={`/destinations/${encodeURIComponent(destination.slug)}`}
        className="destination-link"
        data-featured={featured ? "true" : "false"}
      >
        <span className="featured-chip">Featured for Discover</span>
        <h2 className="destination-name">{destination.nameEn}</h2>
        {destination.nameAr ? (
          <p className="destination-name-ar">{destination.nameAr}</p>
        ) : null}
        <p className="destination-meta">{countryLabel}</p>
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
        {featured ? <p className="cta-hint">Open Ubud →</p> : null}
      </Link>
    </li>
  );
}
