import type { DestinationPublic } from "@helm/api-client-ts";
import { DestinationCard } from "./DestinationCard";
import { StatusPanel } from "./StatusPanel";
import { prioritizeDiscoverDestinations } from "@/lib/destinations/present";

type DiscoverScreenProps = {
  destinations: DestinationPublic[];
  total: number;
  locale?: string;
};

export function DiscoverScreen({
  destinations,
  total,
  locale = "en",
}: DiscoverScreenProps) {
  const ordered = prioritizeDiscoverDestinations(destinations);

  return (
    <main className="shell">
      <p className="eyebrow">Traveler · Discover</p>
      <h1 className="brand-mark">
        Helm
        <span>حلم · Discover</span>
      </h1>
      <p className="lede">
        Browse published destinations for your next trip. Start with Ubud when
        it is live on the catalog.
      </p>

      {total === 0 || ordered.length === 0 ? (
        <StatusPanel
          title="No destinations yet"
          body="The public catalog has no published destinations right now. Check back once destinations are published."
        />
      ) : (
        <>
          <p className="section-label">Published destinations</p>
          <ul className="destination-list">
            {ordered.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                locale={locale}
              />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
