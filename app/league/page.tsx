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
          Welcome to the <RainbowSpellbook /> League
        </h1>

        <div className="guide-copy league-copy">
          <p>
            <RainbowSpellbook /> League is an organized play community built
            for players and Dungeon Masters who want a smooth, connected, and
            rewarding Dungeons &amp; Dragons experience. We use Adventurers
            League guidelines and modules, allowing players to take their
            characters to other AL-approved events and games.
          </p>

          <p>
            Participation in the <RainbowSpellbook /> League season is free,
            and non-event Adventurers League games are posted weekly. Players
            may join the season at any point, create characters, register them
            through the <RainbowSpellbook /> app, and use the Character Log
            system to track adventures, rewards, achievements, and seasonal
            progress. As characters play more games, they build a clear record
            of their journey.
          </p>

          <p>
            Within the nine-month season, we host <GrimoireGatheringsText />, a
            series of nine monthly online convention events featuring games run
            by our roster of professional <RainbowSpellbook /> Dungeon Masters.
            While joining the season is free, individual <GrimoireGatheringsText />{" "}
            events use purchasable badges and game tickets to manage event
            access, scheduling, and table registration.
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
            logged, how event participation works, and how seasonal progress is
            tracked.
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
                    const openSpots = Math.max(game.seatCapacity - signedUpCount, 0);

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
                        <td>{signedUpCount}/{openSpots}</td>
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
