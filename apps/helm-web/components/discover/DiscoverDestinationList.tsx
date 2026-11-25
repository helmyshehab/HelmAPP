"use client";

import { useCallback, useRef, useState } from "react";
import type { DestinationPublic } from "@helm/api-client-ts";
import { createPublicHelmClient } from "@/lib/api/helm-client";
import { DISCOVER_PAGE_SIZE } from "@/lib/destinations/discover-page";
import { DestinationCard } from "./DestinationCard";

type DiscoverDestinationListProps = {
  initialDestinations: DestinationPublic[];
  total: number;
  locale?: string;
  query?: string;
};

type LoadStatus = "idle" | "loading" | "error";

export function DiscoverDestinationList({
  initialDestinations,
  total,
  locale = "en",
  query,
}: DiscoverDestinationListProps) {
  const [destinations, setDestinations] = useState(initialDestinations);
  const [offset, setOffset] = useState(initialDestinations.length);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [reachedEnd, setReachedEnd] = useState(
    initialDestinations.length >= total,
  );
  const inFlight = useRef(false);
  const requestGeneration = useRef(0);

  const activeQuery = query?.trim() ?? "";
  const canLoadMore = !reachedEnd && offset < total;
  const leadId = destinations.find(
    (destination) => destination.isFeatured === true,
  )?.id;

  const loadMore = useCallback(async () => {
    if (inFlight.current || reachedEnd || offset >= total) {
      return;
    }

    const requestOffset = offset;
    const requestQuery = activeQuery;
    const generation = ++requestGeneration.current;

    inFlight.current = true;
    setStatus("loading");

    try {
      const client = createPublicHelmClient();
      const result = await client.listDestinations({
        ...(requestQuery ? { q: requestQuery } : {}),
        limit: DISCOVER_PAGE_SIZE,
        offset: requestOffset,
      });

      if (generation !== requestGeneration.current) {
        return;
      }

      const nextItems = result.items ?? [];
      const nextOffset = requestOffset + nextItems.length;

      setDestinations((current) => {
        const seen = new Set(current.map((destination) => destination.id));
        const appended = nextItems.filter(
          (destination) => !seen.has(destination.id),
        );
        return appended.length === 0 ? current : [...current, ...appended];
      });
      setOffset(nextOffset);
      if (nextItems.length === 0 || nextOffset >= total) {
        setReachedEnd(true);
      }
      setStatus("idle");
    } catch {
      if (generation !== requestGeneration.current) {
        return;
      }
      setStatus("error");
    } finally {
      if (generation === requestGeneration.current) {
        inFlight.current = false;
      }
    }
  }, [activeQuery, offset, reachedEnd, total]);

  return (
    <section aria-labelledby="published-destinations-heading">
      <h2 id="published-destinations-heading" className="section-label">
        Published destinations
      </h2>
      <ul className="destination-list">
        {destinations.map((destination, index) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            locale={locale}
            lead={destination.id === leadId}
            span={index === 0 && destination.id === leadId}
          />
        ))}
      </ul>
      {canLoadMore ? (
        <div className="discover-load-more">
          {status === "error" ? (
            <p className="discover-load-more-error" role="alert">
              Could not load more destinations. Try again.
            </p>
          ) : null}
          <button
            className="discover-load-more-button"
            type="button"
            onClick={() => {
              void loadMore();
            }}
            disabled={status === "loading"}
            aria-busy={status === "loading"}
          >
            {status === "loading"
              ? "Loading…"
              : status === "error"
                ? "Retry"
                : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
