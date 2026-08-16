import Link from "next/link";

import { AdminPageMenu } from "@/components/admin-page-menu";
import { isAdminEmail } from "@/lib/admin-access";
import { requireUser } from "@/lib/auth";

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
    href: "/admin/modules",
    label: "Modules",
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
    href: "/admin/accounting",
    label: "Accounting",
    roles: ["ADMIN", "EVENT_ADMIN"],
  },
  {
    href: "/admin/league-choices",
    label: "League legal choices",
    roles: ["ADMIN", "LEAGUE_ADMIN"],
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

type AdminNavigationRole = "ADMIN" | "EVENT_ADMIN" | "LEAGUE_ADMIN";

async function getVisibleAdminNavigationLinks() {
  const currentUser = await requireUser();
  const hasFullAdminAccess = isAdminEmail(currentUser.email);
  const currentUserRoles = new Set<string>(currentUser.roles);

  const visibleLinks = adminNavigationLinks.filter(
    (link) =>
      hasFullAdminAccess ||
      (link.roles as readonly AdminNavigationRole[]).some((role) => currentUserRoles.has(role))
  );

  return [...visibleLinks, { href: "/", label: "Back home" }];
}

export async function AdminPageHeader({
  description,
  extraActions,
  title,
}: {
  description: string;
  extraActions?: React.ReactNode;
  navigationRole?: AdminNavigationRole;
  title: string;
}) {
  const visibleLinks = await getVisibleAdminNavigationLinks();

  return (
    <div className="list-card stack">
      <AdminPageMenu currentTitle={title} links={visibleLinks} />

      <div>
        <p className="eyebrow" style={{ margin: 0 }}>
          Admin
        </p>
        <h1 style={{ margin: "0.35rem 0 0" }}>{title}</h1>
        <p className="muted" style={{ margin: "0.5rem 0 0" }}>
          {description}
        </p>
      </div>

      {extraActions ? (
        <div className="inline-actions" style={{ flexWrap: "wrap" }}>
          {extraActions}
        </div>
      ) : null}
    </div>
  );
}
