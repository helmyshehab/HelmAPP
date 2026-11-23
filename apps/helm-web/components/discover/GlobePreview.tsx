"use client";

import Link from "next/link";
import type { GlobeDestination } from "@/lib/destinations/globe-destinations";
import { formatTagLabel } from "@/lib/destinations/present";
import { formatCountryLabel } from "@/lib/geo/country-label";

type GlobePreviewProps = {
  destination: GlobeDestination;
  expanded: boolean;
  locale?: string;
  onExpand: () => void;
  onCollapse: () => void;
  onClose: () => void;
};

export function GlobePreview({
  destination,
  expanded,
  locale = "en",
  onExpand,
  onCollapse,
  onClose,
}: GlobePreviewProps) {
  const tags = (destination.tags ?? []).slice(0, 3);
  const summary = destination.summaryEn?.trim();
  const arabicName = destination.nameAr?.trim();
  const countryLabel = formatCountryLabel(destination.countryCode, locale);
  const exploreHref = `/destinations/${encodeURIComponent(destination.slug)}`;

  return (
    <div
      className="globe-preview"
      role="dialog"
      aria-modal="false"
      aria-labelledby="globe-preview-title"
    >
      <div className="globe-preview-header">
        <div className="globe-preview-titles">
          <h3 id="globe-preview-title" className="globe-preview-name">
            {destination.nameEn}
          </h3>
          {arabicName ? (
            <p className="globe-preview-name-ar" lang="ar" dir="rtl">
              {arabicName}
            </p>
          ) : null}
          {countryLabel ? (
            <p className="globe-preview-meta">{countryLabel}</p>
          ) : null}
        </div>
        <div className="globe-preview-controls">
          {expanded ? (
            <button
              type="button"
              className="globe-preview-control"
              onClick={onCollapse}
              aria-expanded="true"
            >
              Collapse
            </button>
          ) : (
            <button
              type="button"
              className="globe-preview-control"
              onClick={onExpand}
              aria-expanded="false"
            >
              Expand
            </button>
          )}
          <button
            type="button"
            className="globe-preview-control"
            onClick={onClose}
            aria-label={`Close preview for ${destination.nameEn}`}
          >
            Close
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="globe-preview-expanded">
          {summary ? <p className="globe-preview-summary">{summary}</p> : null}
          {tags.length > 0 ? (
            <div className="tag-row" aria-label="Tags">
              {tags.map((tag) => (
                <span className="tag" key={tag}>
                  {formatTagLabel(tag)}
                </span>
              ))}
            </div>
          ) : null}
          <Link className="globe-preview-explore" href={exploreHref}>
            Explore
          </Link>
        </div>
      ) : (
        <div className="globe-preview-compact">
          <Link className="globe-preview-explore" href={exploreHref}>
            Explore
          </Link>
        </div>
      )}
    </div>
  );
}
