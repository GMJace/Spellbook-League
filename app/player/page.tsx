import Link from "next/link";
import { CharacterBuildDisplay } from "@/components/character-build-display";
import { ProfileAvatar } from "@/components/profile-avatar";
import { TableActionMenu } from "@/components/table-action-menu";
import { getCharacterLimitForRoles } from "@/lib/character-limits";
import {
  getCharacterTier,
  getCharacterTotalLevel,
} from "@/lib/character";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTidingSummary } from "@/lib/tidings";
import { formatDateTime, formatTier, formatUsd, isPaidTicketPrice } from "@/lib/utils";

export default async function PlayerDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ characterLimit?: string; limit?: string; charactersImported?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const playerName = user.name ?? user.email ?? "Player";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const [characters, openLeagueGames, tidingSummary] = await Promise.all([
    prisma.character.findMany({
      where: { userId: user.id },
      include: {
        participants: {
          include: {
            game: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            achievementAwards: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.game.findMany({
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
    }),
    getUserTidingSummary(user.id),
  ]);

  const gamesPlayedCount = new Set(
    characters.flatMap((character) =>
      character.participants
        .filter(
          (participant) =>
            participant.game.status === "COMPLETED" &&
            participant.logStatus === "APPROVED"
        )
        .map((participant) => participant.game.id)
    )
  ).size;
  const characterLimit = getCharacterLimitForRoles(user.roles);
  const canCreateCharacter = characters.length < characterLimit;
  const availableStoreCreditUsd = Math.max(user.storeCreditUsd - user.storeCreditHeldUsd, 0);

  return (
    <main className="stack">
      {resolvedSearchParams?.characterLimit === "reached" ? (
        <div className="stack" style={{ gap: "0.4rem" }}>
          <p style={{ color: "#ffffff", margin: 0 }}>
            {`You have reached your character limit of ${
              Number(resolvedSearchParams.limit) || characterLimit
            }.`}
          </p>
          {!user.roles.includes("PATRON") ? (
            <p className="muted" style={{ margin: 0 }}>
              Upgrade with{" "}
              <Link href="/league/cart?membership=1">Grimoire Guild membership</Link>{" "}
              to unlock up to 100 character logs for one year.
            </p>
          ) : null}
        </div>
      ) : null}
      {resolvedSearchParams?.charactersImported ? (
        <p style={{ color: "#ffffff", margin: 0 }}>
          Imported {resolvedSearchParams.charactersImported} character logsheet
          {resolvedSearchParams.charactersImported === "1" ? "." : "s."}
        </p>
      ) : null}
      <section className="card ledger-panel stack">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <ProfileAvatar
            name={playerName}
            src={user.profileImagePath}
            size={96}
          />
          <div className="stack" style={{ gap: "0.35rem", flex: "1 1 320px" }}>
            <div>
              <p className="eyebrow">Player Account</p>
              <h2 style={{ margin: 0 }}>{user.name ?? "Unnamed player"}</h2>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Your registered player account details and current access.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Display name</span>
            <strong>{user.name ?? "Not provided"}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Discord handle</span>
            <strong>{user.discordHandle || "Not provided"}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Gameplay</span>
            <strong>{gamesPlayedCount} games played</strong>
          </div>
          {availableStoreCreditUsd > 0 ? (
            <div className="list-card stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Account credit</span>
              <strong>{formatUsd(availableStoreCreditUsd)}</strong>
            </div>
          ) : null}
          <div className="list-card stack" style={{ gap: "0.5rem" }}>
            <span className="muted">Tidings</span>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <span>
                <strong>Earned:</strong> {tidingSummary.earnedCount}
              </span>
              <span>
                <strong>Spent:</strong> {tidingSummary.spentCount}
              </span>
              <span>
                <strong>Available:</strong> {tidingSummary.availableCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="card ledger-panel stack">
        <img
          alt="Character roster divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <h2 style={{ margin: 0 }}>Character roster</h2>
            <p className="muted" style={{ margin: 0 }}>
              {user.roles.includes("PATRON")
                ? `Patron accounts can keep up to ${characterLimit} characters.`
                : `Standard player accounts can keep up to ${characterLimit} characters.`}
            </p>
          </div>
          {canCreateCharacter ? (
            <Link href="/player/characters/new" className="button">
              Create character logsheet
            </Link>
          ) : (
            <span className="pill" style={{ border: "none" }}>
              Character limit reached
            </span>
          )}
        </div>

        {characters.length ? (
          <div className="table-wrap ledger-table">
            <table>
              <thead>
                <tr>
                  <th>Character</th>
                  <th>Build</th>
                  <th>Tier</th>
                  <th>Gold</th>
                  <th>Games</th>
                  <th>Achievements</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => {
                  const totalLevel = getCharacterTotalLevel(character);
                  const loggedGameCount = character.participants.filter(
                    (participant) =>
                      participant.game.status === "COMPLETED" &&
                      participant.logStatus === "APPROVED"
                  ).length;
                  const pendingReviewCount = character.participants.filter(
                    (participant) =>
                      participant.game.status === "COMPLETED" &&
                      participant.logStatus === "PENDING"
                  ).length;

                  return (
                    <tr key={character.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          {character.tokenImagePath ? (
                            <img
                              src={character.tokenImagePath}
                              alt={`${character.name} token`}
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "cover",
                                borderRadius: "999px",
                                border: "1px solid rgba(255, 255, 255, 0.18)",
                              }}
                            />
                          ) : null}
                          <div className="stack" style={{ gap: "0.25rem" }}>
                            <strong>{character.name}</strong>
                            {pendingReviewCount ? (
                              <span className="pill" style={{ width: "fit-content" }}>
                                {pendingReviewCount} pending review
                                {pendingReviewCount === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <CharacterBuildDisplay character={character} compact />
                      </td>
                      <td>Tier {getCharacterTier(totalLevel)}</td>
                      <td>{character.totalGold}</td>
                      <td>{loggedGameCount}</td>
                      <td>{character._count.achievementAwards}</td>
                      <td>
                        <Link
                          href={`/player/characters/${character.id}`}
                          className="button secondary"
                        >
                          OPEN LOGSHEET
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            No characters yet. Create one to begin your logsheet roster.
          </div>
        )}

        <img
          alt="Current open games divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />

        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Current open league games</h2>
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
                        <td>
                          {game.isGrimTidings
                            ? `${game.grimTidingCost} Tiding${game.grimTidingCost === 1 ? "" : "s"}`
                            : game.ticketPrice}
                        </td>
                        <td>{signedUpCount}/{game.seatCapacity}</td>
                        <td>
                          <TableActionMenu>
                            <Link
                              className="button button-secondary button-small"
                              href={`/league/games/${game.id}`}
                            >
                              View game
                            </Link>
                            {isPaidTicketPrice(game.ticketPrice) ? (
                              <Link
                                className="button button-small"
                                href={`/league/cart?games=${encodeURIComponent(game.id)}`}
                              >
                                Add to cart
                              </Link>
                            ) : null}
                          </TableActionMenu>
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
