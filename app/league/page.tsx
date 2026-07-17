import { GrimoireGatheringsText } from "@/components/grimoire-gathering-text";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import Link from "next/link";

export default function LeaguePage() {
  return (
    <main className="stack league-page">
      <section className="card ledger-panel stack league-hero">
        <p className="eyebrow">Organized Play</p>
        <h1 style={{ margin: 0 }}>
          Welcome to the <RainbowSpellbook /> League
        </h1>
        <div className="inline-actions" style={{ flexWrap: "wrap" }}>
          <Link className="button secondary" href="/league/cart">
            Open league cart
          </Link>
        </div>

        <div className="guide-copy league-copy">
          <p>
            <RainbowSpellbook /> League is an organized play community built
            for players and Dungeon Masters who want a smooth, connected, and
            rewarding Dungeons &amp; Dragons experience.
          </p>

          <p>
            At the heart of the league are <GrimoireGatheringsText />, monthly
            online convention events featuring games run by our roster of{" "}
            <RainbowSpellbook /> Dungeon Masters. These events take place
            throughout a free-to-join, nine-month season where players can
            create characters, join games, track progress, and grow their
            heroes over time.
          </p>

          <p>
            Participation in the season is free. Players can sign up at any
            point, register their characters through the <RainbowSpellbook />{" "}
            app, and use the Character Log system to track adventures, rewards,
            achievements, and seasonal progress. As characters play more games,
            they grow through logged accomplishments, unlocking achievements,
            and building a clear record of their journey.
          </p>

          <p>
            <RainbowSpellbook /> League is designed to be easy to join and
            simple to run. A straightforward{" "}
            <a
              className="ledger-link"
              href="https://www.spellbookrpg.games/PG"
              rel="noreferrer"
              target="_blank"
            >
              Player Creation Guide
            </a>{" "}
            and{" "}
            <a
              className="ledger-link"
              href="https://www.spellbookrpg.games/become-an-sb-dm"
              rel="noreferrer"
              target="_blank"
            >
              Dungeon Master Guide
            </a>{" "}
            help everyone understand how the league works, how games are
            logged, and how seasonal participation is tracked.
          </p>

          <p>
            New and aspiring Dungeon Masters are supported with tutorials for
            the <RainbowSpellbook /> app, Roll20, D&amp;D Beyond, Discord, and
            Beyond20. DMs can choose to offer free community games or paid
            ticketed games, depending on the type of table they want to run.
          </p>

          <p>
            The league is powered by a collaborative DM community that works
            together to run weekly games, support new players, organize events,
            and help shape the future of <RainbowSpellbook /> adventures.
            Paired with Discord, D&amp;D Beyond, Roll20, and Beyond20, the
            experience is smooth, accessible, and seamless from sign-up to game
            night.
          </p>

          <p>
            At the end of each season, <RainbowSpellbook /> celebrates the
            community with seasonal awards, prizes, and recognition for the
            players and DMs who helped bring the league to life.
          </p>
        </div>
      </section>
    </main>
  );
}
