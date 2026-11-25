import type { DestinationPublic } from "@helm/api-client-ts";
import { DiscoverDestinationList } from "./DiscoverDestinationList";
import { DiscoverGlobe } from "./DiscoverGlobe";
import { DiscoverSearch } from "./DiscoverSearch";
import { HelmWordmark } from "./HelmWordmark";
import { StatusPanel } from "./StatusPanel";

type DiscoverScreenProps = {
  destinations: DestinationPublic[];
  total: number;
  locale?: string;
  query?: string;
};

export function DiscoverScreen({
  destinations,
  total,
  locale = "en",
  query,
}: DiscoverScreenProps) {
  const hasDestinations = total > 0 && destinations.length > 0;
  const activeQuery = query?.trim() ?? "";
  const isSearching = activeQuery.length > 0;
  // Globe is full-catalog discovery, not a search results map.
  const showGlobe = !isSearching;

  return (
    <main className="shell">
      <header className="discover-hero">
        <HelmWordmark />
        <p className="lede">Browse published destinations.</p>
      </header>

      <DiscoverSearch query={activeQuery} />

      {showGlobe ? <DiscoverGlobe locale={locale} /> : null}

      {hasDestinations ? (
        <DiscoverDestinationList
          key={activeQuery || "all"}
          initialDestinations={destinations}
          total={total}
          locale={locale}
          query={activeQuery || undefined}
        />
      ) : (
        <StatusPanel
          title={isSearching ? "No matching destinations" : "No destinations yet"}
          body={
            isSearching
              ? `No published destinations match “${activeQuery}”. Clear the search to browse the full catalog.`
              : "The public catalog has no published destinations right now. Check back once destinations are published."
          }
        />
      )}
    </main>
  );
}
