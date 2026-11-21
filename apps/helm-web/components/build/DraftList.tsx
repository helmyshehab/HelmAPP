import Link from "next/link";
import type { TripDraft } from "@helm/api-client-ts";
import { StatusPanel } from "@/components/discover/StatusPanel";
import { CreateDraftButton } from "./CreateDraftButton";

type DraftListProps = {
  drafts: TripDraft[];
};

function draftLabel(draft: TripDraft): string {
  const title = draft.title?.trim();
  if (title) return title;
  return "Untitled draft";
}

export function DraftList({ drafts }: DraftListProps) {
  return (
    <section className="build-section">
      <div className="build-toolbar">
        <p className="section-label">Your drafts</p>
        <CreateDraftButton />
      </div>

      {drafts.length === 0 ? (
        <StatusPanel
          title="No drafts yet"
          body="Create a private trip draft to start planning. You can reopen and edit it anytime after refresh."
        />
      ) : (
        <ul className="destination-list">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link href={`/build/${draft.id}`} className="destination-link">
                <h2 className="destination-name">{draftLabel(draft)}</h2>
                <p className="destination-meta">
                  Updated {new Date(draft.updatedAt).toLocaleString()}
                </p>
                <p className="cta-hint">Open draft →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
