"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error-report";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError({
      digest: error.digest ?? null,
      message: error.message || "Unknown global client error",
      path: window.location.pathname,
      source: "app.global-error-boundary",
      stack: error.stack ?? null,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <section className="list-card stack">
            <div>
              <p className="eyebrow">Critical issue</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>The app hit an unrecoverable error</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                The error has been logged for admin review. You can retry the last render
                or return to the homepage.
              </p>
            </div>

            <div className="inline-actions" style={{ flexWrap: "wrap" }}>
              <button className="button secondary" onClick={() => reset()} type="button">
                Try again
              </button>
              <Link className="button secondary" href="/">
                Back home
              </Link>
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
