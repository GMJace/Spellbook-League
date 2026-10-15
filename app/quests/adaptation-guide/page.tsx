import type { Metadata } from "next";
import Link from "next/link";
import { QuestsGuideShell } from "@/components/quests-guide-shell";

export const metadata: Metadata = { title: "QUESTS Adaptation Guide | SPELLBOOK" };

export default function QuestsAdaptationGuidePage() {
  return (
    <QuestsGuideShell slug="adaptation-guide">
      <section className="panel stack quests-guide-copy">
        <h2>Adaptation Guide coming soon</h2>
        <p>The QUESTS Adaptation Guide is being prepared. Check back here for guidance on adapting adventures for SPELLBOOK QUESTS.</p>
        <p>For the current player rules, visit the <Link href="/quests/players-guide">QUESTS Player&apos;s Guide</Link>.</p>
      </section>
    </QuestsGuideShell>
  );
}
