export default function DestinationLoading() {
  return (
    <main className="shell" aria-busy="true">
      <p className="back-link">← Discover</p>
      <div className="loading-pulse">
        <div className="loading-block" data-featured="true" />
        <div className="loading-block" />
      </div>
    </main>
  );
}
