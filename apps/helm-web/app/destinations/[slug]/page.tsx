import { notFound } from "next/navigation";
import type { PlacePublic } from "@helm/api-client-ts";
import { DestinationDetail } from "@/components/destinations/DestinationDetail";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { createPublicHelmClient } from "@/lib/api/helm-client";
import { isNotFoundError } from "@/lib/api/errors";
import type { DestinationDetailFields } from "@/lib/destinations/present";

const PLACES_PAGE_SIZE = 50;

type DestinationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePlacesPage(
  raw: string | string[] | undefined,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export default async function DestinationPage({
  params,
  searchParams,
}: DestinationPageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};

  let destination: DestinationDetailFields;
  let client: ReturnType<typeof createPublicHelmClient>;
  try {
    client = createPublicHelmClient();
    destination = (await client.getDestination(
      slug,
    )) as DestinationDetailFields;
  } catch (err) {
    if (isNotFoundError(err)) notFound();
    return (
      <main className="shell">
        <StatusPanel
          title="Destination unavailable"
          body="We could not load this destination from the public Helm API. Try again once the local backend is reachable."
        />
      </main>
    );
  }

  let places: PlacePublic[] = [];
  let placesTotal = 0;
  let placesPage = parsePlacesPage(query.page);
  let placesError: string | null = null;

  try {
    const limit = PLACES_PAGE_SIZE;
    let offset = (placesPage - 1) * limit;
    let result = await client.listCatalogPlaces({
      destinationSlug: slug,
      limit,
      offset,
      sort: "name",
    });

    placesTotal = result.total;
    if (placesTotal > 0 && offset >= placesTotal) {
      const totalPages = Math.max(1, Math.ceil(placesTotal / limit));
      placesPage = totalPages;
      offset = (placesPage - 1) * limit;
      result = await client.listCatalogPlaces({
        destinationSlug: slug,
        limit,
        offset,
        sort: "name",
      });
      placesTotal = result.total;
    }

    places = result.items;
  } catch {
    placesError =
      "Places for this destination could not be loaded right now. The destination overview is still available.";
  }

  return (
    <DestinationDetail
      destination={destination}
      places={places}
      placesError={placesError}
      placesPage={placesPage}
      placesPageSize={PLACES_PAGE_SIZE}
      placesTotal={placesTotal}
      locale="en"
    />
  );
}
