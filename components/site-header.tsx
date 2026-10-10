"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { SiteRoleLinks } from "@/components/site-role-links";
import { SettingsMenu } from "@/components/settings-menu";
import type { UserNotification } from "@/lib/notifications";

export function SiteHeader({
  adminHref,
  hasDmRole,
  hasPlayerRole,
  isFullAdmin,
  isLeagueAdmin,
  notifications,
  showEventAdminLink,
  unreadNotificationCount,
  userName,
}: {
  adminHref: string;
  hasDmRole: boolean;
  hasPlayerRole: boolean;
  isFullAdmin: boolean;
  isLeagueAdmin: boolean;
  notifications: UserNotification[];
  showEventAdminLink: boolean;
  unreadNotificationCount: number;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <header className={`site-header${mobileNavOpen ? " site-header-nav-open" : ""}`}>
      <div className="site-nav">
        <div className="site-nav-primary">
          <Link href="/" className="brand">
            <img
              alt="SPELLBOOK"
              className="brand-logo"
              height="60"
              src="/Spellbook-Logo.png"
              width="300"
            />
            <span className="sr-only">SPELLBOOK</span>
          </Link>
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-controls="site-mobile-menu"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            {mobileNavOpen ? "^" : "v"}
          </button>
        </div>
        <div className="site-nav-menu" id="site-mobile-menu">
          {userName ? (
            <span className="muted site-welcome">Welcome {userName}</span>
          ) : null}
          <SiteRoleLinks hasDmRole={hasDmRole} hasPlayerRole={hasPlayerRole} />
        </div>
      </div>
      <div className="site-actions">
        {userName ? (
          <>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadNotificationCount}
            />
            <SettingsMenu
              showEventAdminLink={showEventAdminLink}
              showLeagueAdminLink={isLeagueAdmin}
              userName={userName}
              showAdminLink={isFullAdmin}
              adminHref={adminHref}
            />
            <Link className="game-signups-button site-store-button" href="/store">
              <img
                alt=""
                aria-hidden="true"
                className="site-store-button-icon"
                src="/grim-book.png"
              />
              STORE
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="button secondary">
              Login
            </Link>
            <Link href="/register" className="button">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
