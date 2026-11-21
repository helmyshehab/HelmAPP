import Link from "next/link";
import type { TripDraft } from "@helm/api-client-ts";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { BuildSignedOut } from "@/components/build/BuildSignedOut";
import { DraftList } from "@/components/build/DraftList";
import { signOutAction } from "@/app/actions/auth";
import {
  createBootstrappedTravelerClient,
  getTravelerSession,
} from "@/lib/auth/require-traveler";
import { asHelmApiError } from "@/lib/api/errors";

export const metadata = {
  title: "Helm حلم · Build",
  description: "Create and edit private trip drafts.",
};

export default async function BuildPage() {
  const session = await getTravelerSession();

  if (!session) {
    return (
      <main className="shell">
        <p className="eyebrow">Traveler · Build</p>
        <h1 className="brand-mark">
          Helm
          <span>حلم · Build</span>
        </h1>
        <p className="lede">
          Save private trip drafts, reopen them after refresh, and edit your
          plan.
        </p>
        <BuildSignedOut nextPath="/build" />
        <p className="build-inline-action">
          <Link href="/" className="back-link">
            ← Discover
          </Link>
        </p>
      </main>
    );
  }

  let draftsError: string | null = null;
  let drafts: TripDraft[] = [];

  try {
    const client = await createBootstrappedTravelerClient(session.accessToken);
    const response = await client.listTripDrafts(session.accessToken);
    drafts = response.items;
  } catch (err) {
    const api = asHelmApiError(err);
    draftsError =
      api?.status === 401
        ? "Your session could not authorize draft access. Sign in again."
        : err instanceof Error
          ? err.message
          : "Could not load drafts.";
  }

  return (
    <main className="shell">
      <div className="build-header-row">
        <p className="eyebrow">Traveler · Build</p>
        <form action={signOutAction}>
          <button type="submit" className="build-text-button">
            Sign out
          </button>
        </form>
      </div>
      <h1 className="brand-mark">
        Helm
        <span>حلم · Build</span>
      </h1>
      <p className="lede">
        Save private trip drafts, reopen them after refresh, and edit your plan.
      </p>

      {draftsError ? (
        <StatusPanel title="Could not load drafts" body={draftsError} />
      ) : (
        <DraftList drafts={drafts} />
      )}

      <p className="build-inline-action">
        <Link href="/" className="back-link">
          ← Discover
        </Link>
      </p>
    </main>
  );
}
