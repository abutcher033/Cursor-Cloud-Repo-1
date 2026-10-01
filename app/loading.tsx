export default function Loading() {
  return (
    <div className="loading-stack" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton skeleton-strip">
        <span />
        <span />
        <span />
      </div>
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <p className="small loading-label">Loading Local Life…</p>
    </div>
  );
}
