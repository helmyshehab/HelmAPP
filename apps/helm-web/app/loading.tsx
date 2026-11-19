export default function Loading() {
  return (
    <main className="shell" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Traveler · Discover</p>
      <h1 className="brand-mark">
        Helm
        <span>حلم · Discover</span>
      </h1>
      <p className="lede">Loading published destinations…</p>
      <div className="loading-pulse">
        <div className="loading-block" data-featured="true" />
        <div className="loading-block" />
        <div className="loading-block" />
      </div>
    </main>
  );
}
