/**
 * Accessible text stand-in for HELM | حِلْم.
 * IBM Plex Sans Arabic is the interface font, not the finished Naskh wordmark.
 */
export function HelmWordmark() {
  return (
    <h1 className="brand-mark">
      <span className="brand-mark-en" lang="en">
        HELM
      </span>
      <span className="brand-mark-separator"> | </span>
      <span className="brand-mark-ar" lang="ar">
        حِلْم
      </span>
    </h1>
  );
}
