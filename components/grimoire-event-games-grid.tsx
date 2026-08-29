import Link from "next/link";

import { LocalizedEventTime } from "@/components/localized-event-time";
import { formatGrimoireTier, type GrimoireGame } from "@/lib/grimoire";

type GrimoireEventGamesGridProps = {
  emptyMessage: string;
  games: GrimoireGame[];
  showPrice?: boolean;
};

function groupGamesByStartTime(games: GrimoireGame[]) {
  const groups = new Map<string, GrimoireGame[]>();

  for (const game of games) {
    const current = groups.get(game.startAt) ?? [];
    current.push(game);
    groups.set(game.startAt, current);
  }

  return [...groups.entries()].map(([startAt, slotGames]) => ({
    games: slotGames,
    startAt,
  }));
}

export function GrimoireEventGamesGrid({
  emptyMessage,
  games,
  showPrice = false,
}: GrimoireEventGamesGridProps) {
  if (!games.length) {
    return <div className="empty">{emptyMessage}</div>;
  }

  const groupedGames = groupGamesByStartTime(games);

  return (
    <div className="ggcon-event-games-stack">
      {groupedGames.map((group) => (
        <section className="ggcon-event-games-group" key={group.startAt}>
          <div className="ggcon-event-games-time-header">
            <h3 style={{ margin: 0 }}>
              <LocalizedEventTime isoString={group.startAt} />
            </h3>
          </div>

          <div className="ggcon-event-games-grid">
            {group.games.map((game) => (
              <article className="ggcon-event-game-card" key={game.slug}>
                {game.adventureImagePath ? (
                  <img
                    alt={`${game.game} cover art`}
                    className="ggcon-event-game-card-image"
                    src={game.adventureImagePath}
                  />
                ) : (
                  <div className="ggcon-event-game-card-image ggcon-event-game-card-image-placeholder">
                    <div className="ggcon-game-hero-placeholder-inner">
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Adventure art
                      </p>
                      <strong>{game.game}</strong>
                      <p className="muted" style={{ margin: 0 }}>
                        Image placeholder
                      </p>
                    </div>
                  </div>
                )}

                <div className="stack ggcon-event-game-card-copy">
                  <div className="stack" style={{ gap: "0.25rem" }}>
                    <strong>{game.game}</strong>
                    <span className="muted">
                      {game.gameCode?.trim() ? game.gameCode : "Adventure code pending"}
                    </span>
                  </div>

                  <dl className="ggcon-event-game-card-details">
                    <div>
                      <dt>Tier</dt>
                      <dd>{formatGrimoireTier(game.tier)}</dd>
                    </div>
                    <div>
                      <dt>DM</dt>
                      <dd>{game.dm}</dd>
                    </div>
                    {showPrice ? (
                      <div>
                        <dt>Price</dt>
                        <dd>{game.ticketPrice}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="ggcon-event-game-card-actions">
                    <Link
                      className="button secondary button-small"
                      href={`/grimoire-gathering/games/${game.slug}`}
                    >
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
