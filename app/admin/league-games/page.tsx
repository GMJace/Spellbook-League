import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AdminPageHeader } from "@/components/admin-page-header";
import { adminDeleteLeagueGame } from "@/app/admin/league-games/actions";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatTier } from "@/lib/utils";

export default async function AdminLeagueGamesPage({
  searchParams,
}: {
  searchParams: Promise<{
    game?: string;
  }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const games = await prisma.game.findMany({
    where: {
      status: "SCHEDULED",
      datePlayed: {
        gte: new Date(),
      },
    },
    include: {
      dm: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: [{ datePlayed: "asc" }, { title: "asc" }],
  });

  const gameMessageMap: Record<string, string> = {
    deleted: "League game removed.",
    updated: "League game updated.",
    invalid: "The requested league game could not be managed.",
  };
  const gameMessage = params.game ? gameMessageMap[params.game] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {gameMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{gameMessage}</p> : null}

        <AdminPageHeader
          description="Manage the same scheduled future league games currently shown on the homepage."
          title="Current open league games"
        />

        <div className="list-card stack">
          <img
            alt="League games divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Open game list</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Scheduled games with future dates. Edit details, review the public game page,
                or remove a listing entirely.
              </p>
            </div>
          </div>

          <div className="homepage-open-games-grid">
            {games.length ? (
              games.map((game) => {
                const signedUpCount = game._count.participants;
                const availableSpots = Math.max(game.seatCapacity - signedUpCount, 0);

                return (
                  <article className="homepage-open-game-card" key={game.id}>
                    {game.adventureImagePath ? (
                      <img
                        alt={`${game.title} cover art`}
                        className="homepage-open-game-card-image"
                        src={game.adventureImagePath}
                      />
                    ) : (
                      <div className="homepage-open-game-card-image homepage-open-game-card-image-placeholder">
                        <div className="ggcon-game-hero-placeholder-inner">
                          <p className="eyebrow" style={{ margin: 0 }}>
                            Adventure art
                          </p>
                          <strong>{game.title}</strong>
                          <p className="muted" style={{ margin: 0 }}>
                            Image placeholder
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="stack homepage-open-game-card-copy">
                      <div className="stack" style={{ gap: "0.25rem" }}>
                        <strong>{game.title}</strong>
                        <span className="muted">{game.adventureCode}</span>
                      </div>

                      <dl className="homepage-open-game-card-details">
                        <div>
                          <dt>Date &amp; time</dt>
                          <dd>{formatDateTime(game.datePlayed)}</dd>
                        </div>
                        <div>
                          <dt>DM</dt>
                          <dd>{game.dm?.name ?? game.dmName ?? "SPELLBOOK DM"}</dd>
                        </div>
                        <div>
                          <dt>Tier</dt>
                          <dd>{formatTier(game.tier)}</dd>
                        </div>
                        <div>
                          <dt>Price</dt>
                          <dd>
                            {game.isGrimTidings
                              ? `${game.grimTidingCost} Tiding${game.grimTidingCost === 1 ? "" : "s"}`
                              : game.ticketPrice}
                          </dd>
                        </div>
                        <div>
                          <dt>Players</dt>
                          <dd>{signedUpCount}/{game.seatCapacity}</dd>
                        </div>
                        <div>
                          <dt>Available spots</dt>
                          <dd>{availableSpots}</dd>
                        </div>
                      </dl>

                      <div className="homepage-open-game-card-actions">
                        <Link
                          className="button button-secondary button-small"
                          href={`/league/games/${game.id}`}
                        >
                          View game
                        </Link>
                        <Link
                          className="button button-secondary button-small"
                          href={`/admin/league-games/${game.id}/edit`}
                        >
                          Edit
                        </Link>
                        <form action={adminDeleteLeagueGame}>
                          <input name="gameId" type="hidden" value={game.id} />
                          <ConfirmSubmitButton
                            className="button-danger button-small"
                            message={`Delete ${game.title}? This cannot be undone.`}
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty">No current open league games are scheduled right now.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
