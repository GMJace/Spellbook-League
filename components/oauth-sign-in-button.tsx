"use client";

import { signIn } from "next-auth/react";

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="oauth-mark"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.6 12.23c0-.68-.06-1.33-.18-1.95H12v3.69h5.39a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.97-4.34 2.97-7.29Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.62-2.41l-3.24-2.52c-.89.6-2.03.96-3.38.96-2.59 0-4.79-1.75-5.57-4.1H3.08v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.43 13.93A6.01 6.01 0 0 1 6.12 12c0-.67.12-1.31.31-1.93V7.47H3.08A10 10 0 0 0 2 12c0 1.61.38 3.14 1.08 4.53l3.35-2.6Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.97c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.92 5.47l3.35 2.6c.78-2.35 2.98-4.1 5.57-4.1Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg
      aria-hidden="true"
      className="oauth-mark"
      viewBox="0 0 24 24"
    >
      <path
        fill="#5865F2"
        d="M20.32 4.37A19.79 19.79 0 0 0 15.46 3a13.72 13.72 0 0 0-.62 1.27 18.42 18.42 0 0 0-5.68 0A13.7 13.7 0 0 0 8.54 3a19.73 19.73 0 0 0-4.87 1.37C.59 8.92-.25 13.36.17 17.74a19.92 19.92 0 0 0 5.97 3A14.56 14.56 0 0 0 7.43 18.7c-.71-.27-1.39-.6-2.04-.98.17-.12.34-.25.5-.38 3.95 1.85 8.24 1.85 12.14 0 .17.14.33.27.5.38-.65.39-1.34.72-2.05.98.37.71.81 1.39 1.3 2.02a19.86 19.86 0 0 0 5.98-3c.5-5.07-.85-9.46-3.44-13.37ZM9.57 15.07c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.09 2.15 2.42 0 1.33-.95 2.41-2.15 2.41Zm4.86 0c-1.19 0-2.15-1.08-2.15-2.41 0-1.33.95-2.42 2.15-2.42 1.2 0 2.17 1.09 2.15 2.42 0 1.33-.95 2.41-2.15 2.41Z"
      />
    </svg>
  );
}

export function OAuthSignInButton({
  enabled = true,
  label,
  provider,
}: {
  enabled?: boolean;
  label: string;
  provider: "google" | "discord";
}) {
  const icon = provider === "google" ? <GoogleMark /> : <DiscordMark />;

  return (
    <button
      type="button"
      className="secondary oauth-button"
      disabled={!enabled}
      onClick={() => {
        if (!enabled) {
          return;
        }

        void signIn(provider, {
          callbackUrl: "/register/roles",
        });
      }}
      title={enabled ? label : `${label} is not configured yet`}
    >
      {icon}
      {label}
    </button>
  );
}
