import Link from "next/link";
import { StatusPanel } from "@/components/discover/StatusPanel";

export default function DraftNotFound() {
  return (
    <main className="shell">
      <Link href="/build" className="back-link">
        ← Build
      </Link>
      <StatusPanel
        title="Draft not found"
        body="This draft is missing, belongs to another account, or the link is incorrect."
      />
    </main>
  );
}
