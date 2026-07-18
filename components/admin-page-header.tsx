import Link from "next/link";

const adminNavigationLinks = [
  {
    href: "/admin/users",
    label: "Admin directory",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/league-games",
    label: "League games",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/achievements",
    label: "Achievements",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/grimoire-gathering",
    label: "Grimoire moderation",
    roles: ["ADMIN", "EVENT_ADMIN"],
  },
  {
    href: "/admin/league-choices",
    label: "League legal choices",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/spellbook-monthly",
    label: "SPELLBOOK Monthly",
    roles: ["ADMIN"],
  },
  {
    href: "/admin/site-health",
    label: "Site health",
    roles: ["ADMIN"],
  },
] as const;

type AdminNavigationRole = "ADMIN" | "EVENT_ADMIN";

export function AdminPageHeader({
  description,
  extraActions,
  navigationRole = "ADMIN",
  title,
}: {
  description: string;
  extraActions?: React.ReactNode;
  navigationRole?: AdminNavigationRole;
  title: string;
}) {
  const visibleLinks = adminNavigationLinks.filter((link) =>
    (link.roles as readonly AdminNavigationRole[]).includes(navigationRole),
  );

  return (
    <div className="list-card stack">
      <div>
        <p className="eyebrow" style={{ margin: 0 }}>
          Admin
        </p>
        <h1 style={{ margin: "0.35rem 0 0" }}>{title}</h1>
        <p className="muted" style={{ margin: "0.5rem 0 0" }}>
          {description}
        </p>
      </div>

      <div className="inline-actions" style={{ flexWrap: "wrap" }}>
        {visibleLinks.map((link) => (
          <Link key={link.href} className="button secondary" href={link.href}>
            {link.label}
          </Link>
        ))}
        {extraActions}
        <Link className="button secondary" href="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
