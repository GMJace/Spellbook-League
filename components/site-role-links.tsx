"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function SiteRoleLinks({
  hasPlayerRole,
  hasDmRole,
}: {
  hasPlayerRole: boolean;
  hasDmRole: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasBothRoles = hasPlayerRole && hasDmRole;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const links = [
    { href: "/player", label: hasBothRoles ? "PLAYER" : "As Player", enabled: hasPlayerRole },
    { href: "/dm", label: hasBothRoles ? "DM" : "As DM", enabled: hasDmRole },
  ].filter(({ enabled }) => enabled).map(({ href, label }) => {
    const isCurrentPage = pathname === href;
    const isActive = isCurrentPage || pathname.startsWith(`${href}/`);

    return (
      <Link
        key={href}
        className={`site-role-link${isActive ? " site-role-link-active" : ""}`}
        href={href}
        aria-current={isCurrentPage ? "page" : isActive ? "location" : undefined}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  });

  if (!hasBothRoles) {
    return links.length ? <div className="site-role-links">{links}</div> : null;
  }

  return (
    <div
      className="site-role-links site-role-switcher"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="site-role-link site-role-trigger"
        aria-expanded={open}
        aria-controls={dropdownId}
        onClick={() => setOpen((current) => !current)}
      >
        View As <span aria-hidden="true">▾</span>
      </button>
      <div id={dropdownId} className="site-role-dropdown" hidden={!open}>
        {links}
      </div>
    </div>
  );
}
