import Link from "next/link";

const adminNavigationLinks = [
  {
    href: "/admin/users",
    label: "Admin directory",
  },
  {
    href: "/admin/league-games",
    label: "League games",
  },
  {
    href: "/admin/achievements",
    label: "Achievements",
  },
  {
    href: "/admin/grimoire-gathering",
    label: "Grimoire moderation",
  },
  {
    href: "/admin/league-choices",
    label: "League legal choices",
  },
  {
    href: "/admin/spellbook-monthly",
    label: "SPELLBOOK Monthly",
  },
  {
    href: "/admin/site-health",
    label: "Site health",
  },
] as const;

export function AdminPageHeader({
  description,
  extraActions,
  title,
}: {
  description: string;
  extraActions?: React.ReactNode;
  title: string;
}) {
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
        {adminNavigationLinks.map((link) => (
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
