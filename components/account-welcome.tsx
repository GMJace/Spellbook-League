"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { showAccountWelcome } from "@/app/actions/account-welcome";

export function AccountWelcome({ preview = false }: { preview?: boolean }) {
  const [visible, setVisible] = useState(preview && process.env.NODE_ENV === "development");
  const claim = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    if (preview) return;
    let active = true;
    // Reuse the request through React Strict Mode's effect replay.
    claim.current ??= showAccountWelcome();
    void claim.current.then((show) => {
      if (active) setVisible(show);
    }).catch(() => {
      // A failed request must not interrupt the signed-in page.
    });
    return () => { active = false; };
  }, [preview]);

  if (!visible) return null;

  return (
    <section className="card ledger-panel stack account-welcome" aria-labelledby="account-welcome-heading">
      <img
        className="account-welcome-image"
        src="/congratulations-comic-burst.png"
        alt="Congratulations!"
        width="1672"
        height="941"
      />
      <div className="stack account-welcome-copy">
        <h1 id="account-welcome-heading">Welcome to SPELLBOOK!</h1>
        <p><strong>Where the Magic is Written</strong></p>
        <p>You&apos;ve joined a growing community of adventurers, storytellers, and Dungeon Masters from across the multiverse. Whether you&apos;re here to play unforgettable adventures or create them, there&apos;s a place for you at our table.</p>

        <section>
          <h2>⚔️ Players — Become an ORDO Agent!</h2>
          <p>As a member of the <strong>ORDO</strong>, you&apos;re part of a multiversal adventuring guild sworn to preserve the balance.</p>
          <ul>
            <li><strong><Link href="/player/characters/new">Create your character</Link></strong> and prepare for adventure.</li>
            <li><strong><Link href="/league">Join a QUEST</Link></strong> through our game listings, including <Link href="/grimoire-gathering">Grimoire Gatherings</Link> and community games.</li>
            <li><strong>Log your adventures</strong> to earn Loot Chest rolls, collect magical treasures, and unlock achievements.</li>
            <li><strong>Earn Grim Tidings</strong> by participating in Grimoire games and redeem them for special rewards!</li>
          </ul>
        </section>

        <section>
          <h2>📜 Dungeon Masters — Weave Your QUESTS!</h2>
          <p>Every great adventure needs a storyteller. Whether you&apos;re an experienced Dungeon Master or just getting started, there are opportunities to bring your adventures to the community.</p>
          <ul>
            <li><strong>Join the SPELLBOOK professional DM roster</strong> and host games for our events.</li>
            <li><strong>Become a QUEST Weaver</strong> and bring your own adventures to life.</li>
            <li><strong>Create and host QUESTS</strong> for players throughout the multiverse.</li>
            <li><strong>Award achievements</strong> and recognize your players&apos; accomplishments.</li>
            <li><strong>Build the community</strong> by welcoming adventurers of all experience levels.</li>
            <li><strong>Earn recognition and rewards</strong> for delivering outstanding experiences to your players.</li>
          </ul>
        </section>

        <section>
          <h2>❓ Questions? We&apos;re Here to Help!</h2>
          <p>Visit our <strong><Link href="/faq">FAQ</Link></strong> for information about characters, QUESTS, rewards, and how the League works.</p>
          <p>Need a little more guidance? Head over to the <strong><a href="https://discord.gg/wxnpXZchWx" target="_blank" rel="noreferrer">#ask-us-anything channel on the SPELLBOOK Discord</a></strong>, where our team and community are happy to help.</p>
        </section>

        <section>
          <h2>❤️ Thank You for Joining Us!</h2>
          <p>SPELLBOOK is about making D&amp;D more accessible, organized, and enjoyable for everyone.</p>
          <p>Thank you for being part of our growing community. We look forward to seeing the characters you create, the adventures you play, and the stories you bring to the table.</p>
        </section>

        <p><strong>Welcome to SPELLBOOK!</strong></p>
        <Link href="/" className="button" onClick={() => setVisible(false)}>Start my adventure</Link>
      </div>
    </section>
  );
}
