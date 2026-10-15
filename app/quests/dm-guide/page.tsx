import type { Metadata } from "next";
import Link from "next/link";
import { QuestsGuideShell } from "@/components/quests-guide-shell";

export const metadata: Metadata = { title: "QUESTS DM's Guide | SPELLBOOK" };

export default function QuestsDmGuidePage() {
  return (
    <QuestsGuideShell slug="dm-guide">
      <section className="panel stack quests-guide-copy">
        <h2>DM&apos;s Guide coming soon</h2>
        <p>The QUESTS DM&apos;s Guide is being prepared. Check back here for the guide to running SPELLBOOK QUESTS.</p>
        <p>For the current player rules, visit the <Link href="/quests/players-guide">QUESTS Player&apos;s Guide</Link>.</p>
      </section>
    </QuestsGuideShell>
  );
}
