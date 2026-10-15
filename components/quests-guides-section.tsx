import Link from "next/link";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { questsGuides } from "@/lib/quests-guides";

export function QuestsGuidesSection() {
  return (
    <section
      id="quests-guides"
      className="card ledger-panel stack homepage-quests-guides"
      aria-labelledby="quests-guides-heading"
    >
      <h2 id="quests-guides-heading" style={{ margin: 0 }}>
        <RainbowSpellbook /> QUESTS Guides
      </h2>
      <div className="homepage-encounters-grid">
        {questsGuides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/quests/${guide.slug}`}
            className="handbook-link-card homepage-encounter-link"
          >
            <img
              alt=""
              className="homepage-quests-guide-icon"
              src="/Q-book-logo.png"
              width="69"
              height="81"
            />
            <strong>{guide.label}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
