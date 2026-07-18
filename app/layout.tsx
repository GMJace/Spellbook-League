import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { NotificationBell } from "@/components/notification-bell";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { SettingsMenu } from "@/components/settings-menu";
import { isAdminEmail } from "@/lib/admin-access";
import { getUnreadNotificationCount, getUserNotifications } from "@/lib/notifications";
import "./globals.css";

const socialLinks = [
  {
    href: "https://www.facebook.com/SpellbookPublishing",
    label: "Facebook",
    icon: (
      <path d="M14 4h3V0h-3c-3.3 0-6 2.7-6 6v3H5v4h3v11h4V13h4l1-4h-5V6c0-1.1.9-2 2-2Z" />
    ),
  },
  {
    href: "https://www.instagram.com/spellbookrpg/",
    label: "Instagram",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.25" />
      </>
    ),
  },
  {
    href: "https://www.twitch.tv/spellbookrpg",
    label: "Twitch",
    icon: (
      <path d="M5 2 3 7v13h5v4l4-4h4l5-5V2H5Zm14 12-3 3h-4l-3 3v-3H6V4h13v10ZM10 7H8v6h2V7Zm5 0h-2v6h2V7Z" />
    ),
  },
  {
    href: "https://www.youtube.com/@spellbookrpg",
    label: "YouTube",
    icon: (
      <>
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.5 12 4.5 12 4.5s-5.6 0-7.5.6A3 3 0 0 0 2.4 7.2 31.8 31.8 0 0 0 1.9 12c0 1.6.2 3.2.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 7.5.6 7.5.6s5.6 0 7.5-.6a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8Z" />
        <path d="m10 15.5 5.2-3.5L10 8.5v7Z" fill="#000000" />
      </>
    ),
  },
  {
    href: "https://x.com/GMJustJace",
    label: "X",
    icon: (
      <path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.2L6.6 21H3.5l7.3-8.4L1 3h6.3l4.3 5.7L18.9 3Zm-1.1 16h1.7L6.4 4.9H4.6L17.8 19Z" />
    ),
  },
] as const;

export const metadata: Metadata = {
  title: "SPELLBOOK",
  description: "A tabletop league tracker for players and dungeon masters.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;
  const [notifications, unreadNotificationCount] = user?.id
    ? await Promise.all([
        getUserNotifications(user.id),
        getUnreadNotificationCount(user.id),
      ])
    : [[], 0];

  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <header className="site-header">
            <div className="site-nav">
              <Link href="/" className="brand">
                <img
                  alt="SPELLBOOK"
                  className="brand-logo"
                  height="60"
                  src="/spellbook-logo.svg"
                  width="300"
                />
                <span className="sr-only">SPELLBOOK</span>
              </Link>
              {user ? (
                <span className="muted site-welcome">
                  Welcome {user.name ?? user.email}
                </span>
              ) : null}
              <div className="site-role-links">
                {user?.roles.includes("PLAYER") ? <Link href="/player">PLAYER</Link> : null}
                {user?.roles.includes("DM") ? <Link href="/dm">DM</Link> : null}
              </div>
            </div>
            <div className="site-actions">
              {user ? (
                <>
                  <Link href="/store">STORE</Link>
                  <NotificationBell
                    notifications={notifications}
                    unreadCount={unreadNotificationCount}
                  />
                  <SettingsMenu
                    showEventAdminLink={user.roles.includes("EVENT_ADMIN")}
                    userName={user.name ?? user.email ?? "Account"}
                    showAdminLink={isAdminEmail(user.email)}
                  />
                  <a
                    className="game-signups-button"
                    href="https://discord.com/channels/744348925414080592/1324788600851796080"
                    rel="noreferrer"
                    target="_blank"
                  >
                    GAME SIGNUPS
                  </a>
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
          <main className="site-main">{children}</main>
          <footer className="site-footer" aria-label="Site disclaimer">
            <div className="social-links" aria-label="SPELLBOOK social media links">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  className="social-link"
                  href={link.href}
                  rel="noreferrer"
                  target="_blank"
                  aria-label={link.label}
                  title={link.label}
                >
                  <svg
                    aria-hidden="true"
                    className="social-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    {link.icon}
                  </svg>
                </a>
              ))}
            </div>
            <p>
              <RainbowSpellbook /> Publishing© is a creative subsidiary of Black Tie Media
            </p>
            <p>
              Dungeons &amp; Dragons® and all associated trademarks, logos, and intellectual
              property are the property of Wizards of the Coast LLC, a subsidiary of Hasbro,
              Inc. This website and its content are not affiliated with, endorsed, sponsored, or
              specifically approved by Wizards of the Coast.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
