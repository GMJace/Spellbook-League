"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminPageMenuLink = {
  href: string;
  label: string;
};

export function AdminPageMenu({
  currentTitle,
  links,
}: {
  currentTitle: string;
  links: AdminPageMenuLink[];
}) {
  const pathname = usePathname();
  const activeLink = links.find((link) => link.href !== "/" && pathname === link.href);
  const currentLabel = activeLink?.label ?? currentTitle;

  return (
    <div className="stack admin-page-menu-shell" style={{ gap: "0.55rem" }}>
      <span className="muted admin-page-menu-label">
        Admin menu
      </span>
      <details className="admin-page-menu-details">
        <summary className="admin-page-menu-summary">
          Current page: {currentLabel}
        </summary>
        <div className="stack admin-page-menu-links" style={{ gap: "0.65rem" }}>
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                className={`button admin-page-menu-link ${isActive ? "admin-page-menu-link-active" : "secondary"}`}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
