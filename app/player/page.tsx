import Link from "next/link";
import { CharacterBuildDisplay } from "@/components/character-build-display";
import {
  getCharacterTier,
  getCharacterTotalLevel,
} from "@/lib/character";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatTier, isPaidTicketPrice } from "@/lib/utils";

export default async function PlayerDashboardPage() {
  const user = await requireRole("PLAYER");
  const playerName = user.name ?? user.email ?? "Player";
  const playerInitials = playerName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const [characters, openLeagueGames] = await Promise.all([
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
  ]);

  const gamesPlayedCount = new Set(
    characters.flatMap((character) =>
      character.participants.map((participant) => participant.game.id)
    )
  ).size;

  return (
    <main className="stack">
      <section className="card ledger-panel stack">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {user.profileImagePath ? (
            <img
              alt={`${playerName} profile picture`}
              src={user.profileImagePath}
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              aria-label={`${playerName} profile picture placeholder`}
              role="img"
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at top, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04))",
                color: "#ffffff",
                fontFamily: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                flexShrink: 0,
              }}
            >
              {playerInitials}
            </div>
          )}
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
            <span className="muted">Roles</span>
            <strong>{user.roles.join(", ")}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Games played</span>
            <strong>{gamesPlayedCount}</strong>
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
          <h2 style={{ margin: 0 }}>Character roster</h2>
          <Link href="/player/characters/new" className="button">
            Create character logsheet
          </Link>
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
                      <td>{character.participants.length}</td>
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
