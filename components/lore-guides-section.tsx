import Link from "next/link";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { loreGuides } from "@/lib/lore-guides";

export function LoreGuidesSection() {
  return (
    <section
      id="lore-guides"
      className="card ledger-panel stack homepage-quests-guides"
      aria-labelledby="lore-guides-heading"
    >
      <h2 id="lore-guides-heading" style={{ margin: 0 }}>
        <RainbowSpellbook /> Lore Guides
      </h2>
      <div className="homepage-encounters-grid">
        {loreGuides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/lore/${guide.slug}`}
            className="handbook-link-card homepage-encounter-link"
          >
            <span className="lore-guide-icon">
              <img
                alt=""
                className={`homepage-quests-guide-icon${"darkImage" in guide ? " lore-guide-icon-light" : ""}`}
                src={guide.image}
                width="69"
                height="81"
              />
              {"darkImage" in guide && (
                <img
                  alt=""
                  className="homepage-quests-guide-icon lore-guide-icon-dark"
                  src={guide.darkImage}
                  width="69"
                  height="81"
                />
              )}
            </span>
            <strong>{guide.label}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
