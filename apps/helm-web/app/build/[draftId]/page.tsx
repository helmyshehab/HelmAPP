import Link from "next/link";
import { notFound } from "next/navigation";
import { BuildSignedOut } from "@/components/build/BuildSignedOut";
import { DraftEditor } from "@/components/build/DraftEditor";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { signOutAction } from "@/app/actions/auth";
import { asHelmApiError, isNotFoundError } from "@/lib/api/errors";
import {
  createBootstrappedTravelerClient,
  getTravelerSession,
} from "@/lib/auth/require-traveler";
import { loadPublishedDestinationCatalog } from "@/lib/destinations/load-published-catalog";

type DraftPageProps = {
  params: Promise<{ draftId: string }>;
};

export async function generateMetadata({ params }: DraftPageProps) {
  const { draftId } = await params;
  return {
    title: "Helm حلم · Draft",
    description: `Edit trip draft ${draftId}.`,
  };
}

export default async function DraftPage({ params }: DraftPageProps) {
  const { draftId } = await params;
  const session = await getTravelerSession();

  if (!session) {
    return (
      <main className="shell">
        <Link href="/build" className="back-link">
          ← Build
        </Link>
        <p className="eyebrow">Traveler · Build</p>
        <h1 className="brand-mark">
          Helm
          <span>حلم · Draft</span>
        </h1>
        <BuildSignedOut nextPath={`/build/${draftId}`} />
      </main>
    );
  }

  let draft;
  try {
    const client = await createBootstrappedTravelerClient(session.accessToken);
    draft = await client.getTripDraft(draftId, session.accessToken);
  } catch (err) {
    if (isNotFoundError(err)) {
      notFound();
    }
    const api = asHelmApiError(err);
    const body =
      api?.status === 401
        ? "Your session could not authorize this draft. Sign in again."
        : err instanceof Error
          ? err.message
          : "Could not load draft.";
    return (
      <main className="shell">
        <Link href="/build" className="back-link">
          ← Build
        </Link>
        <StatusPanel title="Could not load draft" body={body} />
      </main>
    );
  }

  const destinationCatalog = await loadPublishedDestinationCatalog();

  return (
    <main className="shell">
      <div className="build-header-row">
        <Link href="/build" className="back-link">
          ← Build
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="build-text-button">
            Sign out
          </button>
        </form>
      </div>
      <p className="eyebrow">Traveler · Build</p>
      <h1 className="brand-mark">
        Helm
        <span>حلم · Draft</span>
      </h1>
      <p className="lede">
        Edit supported draft fields and save. Cleared title or destination is
        sent as null; unchanged fields stay omitted.
      </p>
      <DraftEditor
        key={`${session.userId}:${draft.id}`}
        ownerUserId={session.userId}
        draft={draft}
        destinationCatalog={destinationCatalog}
      />
    </main>
  );
}
