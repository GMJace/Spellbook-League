import { GrimoireGatheringsText } from "@/components/grimoire-gathering-text";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { getHomepageData } from "@/lib/data";
import { formatDateTime, formatTier, isPaidTicketPrice } from "@/lib/utils";
import Link from "next/link";

export default async function LeaguePage() {
  const { openLeagueGames } = await getHomepageData();

  return (
    <main className="stack league-page">
      <section className="card ledger-panel stack league-hero">
        <p className="eyebrow">Organized Play</p>
        <h1 style={{ margin: 0 }}>
          Welcome to the <RainbowSpellbook /> Community
        </h1>

        <div className="guide-copy league-copy">
          <p>
            <RainbowSpellbook /> is an organized play community built for
            players and Dungeon Masters who want a smooth, connected, and
            rewarding Dungeons &amp; Dragons experience. We use Adventurers
            League guidelines and modules, allowing players to take their
            characters to other AL-approved events and games. We also support
            Legends of Greyhawk organized play and encourage DMs to feel
            supported to run publicly published LoG content.
          </p>

          <p>
            Participation in the <RainbowSpellbook /> League is free, and
            non-event Adventurers League games are posted weekly. Players may
            join the games at any point, create characters, register them
            through the <RainbowSpellbook /> app, and use the Character Log
            system to track adventures, rewards, achievements, and progress.
            As characters play more games, they build a clear record of their
            journey.
          </p>

          <p>
            Throughout the year, we host <GrimoireGatheringsText />, a series
            of quarterly online convention events featuring games run by our
            roster of professional <RainbowSpellbook /> Dungeon Masters.
            {" "}
            <GrimoireGatheringsText /> events use purchasable badges and game
            tickets to manage event access, scheduling, and table registration.
          </p>

          <p>
            <RainbowSpellbook /> is designed to be easy to join and simple to
            run. A straightforward{" "}
            <a
              className="ledger-link"
              download
              href="/handbooks/adventurers-league-players-guide-v2026.4.pdf"
            >
              Player's Guide
            </a>{" "}
            and{" "}
            <a
              className="ledger-link"
              download
              href="/handbooks/adventurers-league-dm-guide-v2026.2.pdf"
            >
              DM's Guide
            </a>{" "}
            help everyone understand how the league works, how games are
            logged, how event participation works, and how progress is tracked.
          </p>

          <p>
            New and aspiring Dungeon Masters are supported with tutorials for
            the <RainbowSpellbook /> app, Roll20, D&amp;D Beyond, Discord, and
            Beyond20. DMs can choose to offer free community games or paid
            ticketed games, depending on the type of table they want to run -
            any time day or night.
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
            players and DMs who helped bring the community to life.
          </p>

          <p>
            Looking to DM in a safe, inclusive community? This just in:
            {" "}
            <RainbowSpellbook /> is recruiting resident DMs for free and
            paid-to-play games. All we ask is that you follow the community
            code of conduct and run at least one <RainbowSpellbook /> game
            monthly in support of the growing community.
          </p>

          <p>
            It's time to join the community where magic is written!
          </p>
        </div>
      </section>

      <section className="card ledger-panel stack homepage-open-games-section">
        <img
          alt="Open league games divider"
          className="homepage-roster-divider"
          src="/divider4.png"
        />

        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Available league games</h2>
        </div>

        <div className="list-card stack">
          <div className="table-wrap ledger-table activity-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Game</th>
                  <th>DM</th>
                  <th>Tier</th>
                  <th>Price</th>
                  <th>Players</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {openLeagueGames.length ? (
                  openLeagueGames.map((game) => {
                    const signedUpCount = game._count.participants;

                    return (
                      <tr key={game.id}>
                        <td>{formatDateTime(game.datePlayed)}</td>
                        <td>
                          <div className="stack" style={{ gap: "0.2rem" }}>
                            <strong>{game.title}</strong>
                            <span className="muted">{game.adventureCode}</span>
                          </div>
                        </td>
                        <td>{game.dm?.name ?? game.dmName ?? "SPELLBOOK DM"}</td>
                        <td>{formatTier(game.tier)}</td>
                        <td>{game.ticketPrice}</td>
                        <td>{signedUpCount}/{game.seatCapacity}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <Link
                              className="button button-secondary button-small"
                              href={`/league/games/${game.id}`}
                            >
                              View game
                            </Link>
                            {game.dm?.id ? (
                              <Link
                                className="button button-secondary button-small"
                                href={`/dm/${game.dm.id}`}
                              >
                                View DM
                              </Link>
                            ) : null}
                            {isPaidTicketPrice(game.ticketPrice) ? (
                              <Link
                                className="button button-small"
                                href={`/league/cart?games=${encodeURIComponent(game.id)}`}
                              >
                                Add to cart
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="muted" colSpan={7}>
                      No open league games are scheduled right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
