import Link from "next/link";
import type { ReactNode } from "react";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { questsGuides } from "@/lib/quests-guides";

export function QuestsGuideShell({
  slug,
  children,
}: {
  slug: (typeof questsGuides)[number]["slug"];
  children: ReactNode;
}) {
  const guide = questsGuides.find((entry) => entry.slug === slug)!;

  return (
    <div id="quests-guides-top" className="stack quests-guide-page">
      <header className="panel stack quests-guide-header">
        <Link href="/#quests-guides">Back to QUESTS Guides</Link>
        <div className="quests-guide-title">
          <img src="/Q-book-logo.png" width="69" height="81" alt="" />
          <div>
            <p className="eyebrow"><RainbowSpellbook /> QUESTS</p>
            <h1>QUESTS {guide.label}</h1>
          </div>
        </div>
        <nav className="inline-actions" aria-label="QUESTS guides">
          {questsGuides.map((entry) => (
            <Link
              key={entry.slug}
              href={`/quests/${entry.slug}`}
              className="button button-secondary button-small"
              aria-current={entry.slug === slug ? "page" : undefined}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
