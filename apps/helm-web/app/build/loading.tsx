export default function BuildLoading() {
  return (
    <main className="shell" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Traveler · Build</p>
      <h1 className="brand-mark">
        Helm
        <span>حلم · Build</span>
      </h1>
      <p className="lede">Loading your drafts…</p>
      <div className="loading-pulse">
        <div className="loading-block" data-featured="true" />
        <div className="loading-block" />
        <div className="loading-block" />
      </div>
    </main>
  );
}
