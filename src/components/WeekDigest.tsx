"use client";

import { useState } from "react";

export function WeekDigest({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card" data-testid="week-digest">
      <h2 style={{ marginBottom: 6 }}>This week · share text</h2>
      <p className="small" style={{ marginBottom: 8 }}>
        Email digest is a Phase-later hook (<code>DIGEST_WEBHOOK_URL</code>). Copy this for now, or download .ics from any detail page.
      </p>
      <textarea
        readOnly
        value={text}
        rows={6}
        style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", padding: 10, font: "inherit", background: "var(--cream-2)" }}
        data-testid="week-digest-text"
      />
      <button
        type="button"
        className="secondary"
        style={{ marginTop: 8 }}
        data-testid="week-digest-copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? "Copied" : "Copy This week"}
      </button>
    </div>
  );
}
