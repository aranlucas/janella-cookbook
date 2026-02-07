"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Outfit', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          backgroundColor: "#faf5ed",
          color: "#2d2926",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "480px" }}>
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
              lineHeight: 1,
            }}
          >
            🍳
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#6b635c",
              fontSize: "1.125rem",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            An unexpected error occurred. Don&apos;t worry, your recipes are
            safe.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#e04e39",
              color: "#fff",
              border: "none",
              borderRadius: "0.625rem",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
