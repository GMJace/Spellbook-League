"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

export function SettingsMenu({
  adminHref = "/admin/users",
  showEventAdminLink = false,
  showLeagueAdminLink = false,
  userName,
  showAdminLink = false,
}: {
  adminHref?: string;
  showEventAdminLink?: boolean;
  showLeagueAdminLink?: boolean;
  userName: string;
  showAdminLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        type="button"
        className="settings-trigger"
        aria-label="Open settings menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 8.75A3.25 3.25 0 1 0 12 15.25A3.25 3.25 0 1 0 12 8.75Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M19.3 13.5C19.35 13.01 19.38 12.51 19.38 12C19.38 11.49 19.35 10.99 19.3 10.5L21.18 9.03C21.35 8.9 21.4 8.66 21.3 8.46L19.52 5.38C19.41 5.18 19.18 5.1 18.98 5.18L16.76 6.07C15.98 5.47 15.11 4.99 14.16 4.67L13.82 2.31C13.79 2.1 13.61 1.94 13.39 1.94H10.61C10.39 1.94 10.21 2.1 10.18 2.31L9.84 4.67C8.89 4.99 8.02 5.47 7.24 6.07L5.02 5.18C4.82 5.1 4.59 5.18 4.48 5.38L2.7 8.46C2.6 8.66 2.65 8.9 2.82 9.03L4.7 10.5C4.65 10.99 4.62 11.49 4.62 12C4.62 12.51 4.65 13.01 4.7 13.5L2.82 14.97C2.65 15.1 2.6 15.34 2.7 15.54L4.48 18.62C4.59 18.82 4.82 18.9 5.02 18.82L7.24 17.93C8.02 18.53 8.89 19.01 9.84 19.33L10.18 21.69C10.21 21.9 10.39 22.06 10.61 22.06H13.39C13.61 22.06 13.79 21.9 13.82 21.69L14.16 19.33C15.11 19.01 15.98 18.53 16.76 17.93L18.98 18.82C19.18 18.9 19.41 18.82 19.52 18.62L21.3 15.54C21.4 15.34 21.35 15.1 21.18 14.97L19.3 13.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="settings-dropdown">
          <div className="settings-header">
            <strong>{userName}</strong>
          </div>
          <Link href="/profile" className="settings-item" onClick={() => setOpen(false)}>
            Account
          </Link>
          {showAdminLink ? (
            <Link href={adminHref} className="settings-item" onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : null}
          {!showAdminLink && showLeagueAdminLink ? (
            <Link
              href="/admin/league-choices"
              className="settings-item"
              onClick={() => setOpen(false)}
            >
              League Choices
            </Link>
          ) : null}
          {!showAdminLink && showEventAdminLink ? (
            <Link
              href="/admin/grimoire-gathering"
              className="settings-item"
              onClick={() => setOpen(false)}
            >
              Grimoire Moderation
            </Link>
          ) : null}
          <Link href="/faq" className="settings-item" onClick={() => setOpen(false)}>
            FAQ/Contact
          </Link>
          <button
            type="button"
            className="settings-item settings-logout"
            onClick={() => {
              void signOut({ callbackUrl: "/" });
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
