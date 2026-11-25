import { HelmWordmark } from "@/components/discover/HelmWordmark";

export default function Loading() {
  return (
    <main className="shell" aria-busy="true" aria-live="polite">
      <header className="discover-hero">
        <HelmWordmark />
        <p className="lede">Loading published destinations…</p>
      </header>
      <div className="destination-list loading-pulse" aria-hidden="true">
        <div className="loading-block" />
        <div className="loading-block" />
        <div className="loading-block" />
        <div className="loading-block" />
      </div>
    </main>
  );
}
