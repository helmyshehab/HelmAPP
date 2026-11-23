import type { DestinationPublic } from "@helm/api-client-ts";
import { DestinationCard } from "./DestinationCard";
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
  const leadId = destinations.find(
    (destination) => destination.isFeatured === true,
  )?.id;
  const hasDestinations = total > 0 && destinations.length > 0;
  const activeQuery = query?.trim() ?? "";
  const isSearching = activeQuery.length > 0;

  return (
    <main className="shell">
      <header className="discover-hero">
        <HelmWordmark />
        <p className="lede">Browse published destinations.</p>
      </header>

      <DiscoverSearch query={activeQuery} />

      {hasDestinations ? (
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
        </section>
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
