import { notFound } from "next/navigation";
import { DestinationDetail } from "@/components/destinations/DestinationDetail";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { createPublicHelmClient } from "@/lib/api/helm-client";
import { isNotFoundError } from "@/lib/api/errors";
import type { DestinationDetailFields } from "@/lib/destinations/present";

type DestinationPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DestinationPage({ params }: DestinationPageProps) {
  const { slug } = await params;

  try {
    const client = createPublicHelmClient();
    const destination = (await client.getDestination(
      slug,
    )) as DestinationDetailFields;
    return <DestinationDetail destination={destination} locale="en" />;
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
}
