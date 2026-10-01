"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card error-page">
      <h1>Something went wrong</h1>
      <p className="sub">{error.message || "The page failed. Your session is unchanged."}</p>
      <button className="primary" type="button" onClick={() => reset()}>Try again</button>
    </div>
  );
}
