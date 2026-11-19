import Link from "next/link";
import { StatusPanel } from "@/components/discover/StatusPanel";

export default function DestinationNotFound() {
  return (
    <main className="shell">
      <Link href="/" className="back-link">
        ← Discover
      </Link>
      <StatusPanel
        title="Destination not found"
        body="This destination is not published on the public catalog, or the link is incorrect."
      />
    </main>
  );
}
