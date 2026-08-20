import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TableActionMenu } from "@/components/table-action-menu";
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

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Game</th>
                  <th>Dungeon Master</th>
                  <th>Tier</th>
                  <th>Price</th>
                  <th>Players</th>
                  <th>Available spots</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.length ? (
                  games.map((game) => {
                    const signedUpCount = game._count.participants;
                    const availableSpots = Math.max(game.seatCapacity - signedUpCount, 0);

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
                        <td>{signedUpCount}</td>
                        <td>
                          {availableSpots} of {game.seatCapacity}
                        </td>
                        <td>
                          <TableActionMenu>
                            <Link
                              className="button button-secondary button-small"
                              href={`/league/games/${game.id}`}
                            >
                              View
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
                          </TableActionMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="muted" colSpan={8}>
                      No current open league games are scheduled right now.
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
