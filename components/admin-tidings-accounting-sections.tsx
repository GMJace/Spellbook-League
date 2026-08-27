import Link from "next/link";

import { AdminCreateGrimTidingsGameForm } from "@/components/admin-create-grim-tidings-game-form";
import { TableActionMenu } from "@/components/table-action-menu";
import { getLeaguePlayers } from "@/lib/data";
import {
  getCharacterBuildMagicItemOptions,
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
} from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";
import { getAdminTidingRows } from "@/lib/tidings";
import { formatDateTime, formatTier } from "@/lib/utils";

export async function AdminTidingsAccountingSections() {
  const [
    players,
    grimTidingsGames,
    tidingRows,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  ] = await Promise.all([
    getLeaguePlayers({ includePrivateCharacters: true }),
    prisma.game.findMany({
      where: {
        isGrimTidings: true,
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
    }),
    getAdminTidingRows(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  const playersForForm = players.map((player) => ({
    id: player.id,
    name: player.name,
    characters: player.characters.map((character) => ({
      id: character.id,
      name: character.name,
    })),
  }));
  const legalRewardsJson = JSON.stringify({
    legalBuildMagicItemOptions: getCharacterBuildMagicItemOptions(legalMagicItemOptions),
    legalCommonMagicItemOptions: legalMagicItemOptions.Common,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  });

  return (
    <>
      <div className="list-card stack">
        <img alt="Tidings divider" className="ggcon-table-divider" src="/divider4.png" />
        <div className="section-heading">
          <div>
            <h2 style={{ margin: 0 }}>Create Grim Tidings game</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Build a limited-access league game using the regular game format. New scheduled Grim
              Tidings games automatically appear in the league cart so players can spend Tidings to
              claim a seat.
            </p>
          </div>
        </div>

        <AdminCreateGrimTidingsGameForm
          legalRewardsJson={legalRewardsJson}
          playersJson={JSON.stringify(playersForForm)}
        />
      </div>

      <div className="list-card stack">
        <img alt="Tidings divider" className="ggcon-table-divider" src="/divider4.png" />
        <div className="section-heading">
          <div>
            <h2 style={{ margin: 0 }}>Current Grim Tidings games</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Scheduled future Grim Tidings games that players can currently claim through the
              league cart.
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
                <th>Tiding cost</th>
                <th>Players</th>
                <th>Available spots</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grimTidingsGames.length ? (
                grimTidingsGames.map((game) => {
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
                      <td>
                        {game.grimTidingCost} Tiding{game.grimTidingCost === 1 ? "" : "s"}
                      </td>
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
                        </TableActionMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="muted" colSpan={8}>
                    No scheduled Grim Tidings games are in the cart right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="list-card stack">
        <img alt="Tidings divider" className="ggcon-table-divider" src="/divider4.png" />
        <div className="section-heading">
          <div>
            <h2 style={{ margin: 0 }}>Tidings by player or DM</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Track how many Tidings each eligible user has earned, spent, and still has available.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Roles</th>
                <th>Earned</th>
                <th>Spent</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {tidingRows.length ? (
                tidingRows.map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <strong>{row.userName}</strong>
                    </td>
                    <td>{row.roleLabels.join(", ") || "—"}</td>
                    <td>{row.earnedCount}</td>
                    <td>{row.spentCount}</td>
                    <td>
                      <strong>{row.availableCount}</strong>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="muted" colSpan={5}>
                    No player or DM Tidings have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
