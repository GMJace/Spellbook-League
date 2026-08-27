"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteRoleLinks({
  hasPlayerRole,
  hasDmRole,
}: {
  hasPlayerRole: boolean;
  hasDmRole: boolean;
}) {
  const pathname = usePathname();
  const isPlayerActive = pathname === "/player" || pathname.startsWith("/player/");
  const isDmActive = pathname === "/dm" || pathname.startsWith("/dm/");

  return (
    <div className="site-role-links">
      {hasPlayerRole ? (
        <Link
          className={`site-role-link${isPlayerActive ? " site-role-link-active" : ""}`}
          href="/player"
        >
          As Player
        </Link>
      ) : null}
      {hasDmRole ? (
        <Link
          className={`site-role-link${isDmActive ? " site-role-link-active" : ""}`}
          href="/dm"
        >
          As DM
        </Link>
      ) : null}
    </div>
  );
}
