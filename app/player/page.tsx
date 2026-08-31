import Link from "next/link";
import { CharacterRosterGrid, type PlayerRow } from "@/components/homepage-activity-board";
import { ProfileAvatar } from "@/components/profile-avatar";
import { TwoRowScrollableGrid } from "@/components/two-row-scrollable-grid";
import {
  getCharacterLimitForRoles,
  hasPatronCharacterLimit,
} from "@/lib/character-limits";
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
  const playerRoster: PlayerRow[] = characters.map((character) => ({
    id: character.id,
    playerName,
    characterName: character.name,
    class1Name: character.class1Name,
    class1Subclass: character.class1Subclass,
    class1Level: character.class1Level,
    class2Name: character.class2Name,
    class2Subclass: character.class2Subclass,
    class2Level: character.class2Level,
    class3Name: character.class3Name,
    class3Subclass: character.class3Subclass,
    class3Level: character.class3Level,
    tokenImagePath: character.tokenImagePath,
    totalGold: character.totalGold,
    gamesPlayed: character.participants.filter(
      (participant) =>
        participant.game.status === "COMPLETED" &&
        participant.logStatus === "APPROVED"
    ).length,
  }));

  return (
    <main className="stack">
      {resolvedSearchParams?.characterLimit === "reached" ? (
        <div className="stack" style={{ gap: "0.4rem" }}>
          <p style={{ color: "#ffffff", margin: 0 }}>
            {`You have reached your character limit of ${
              Number(resolvedSearchParams.limit) || characterLimit
            }.`}
          </p>
          {!hasPatronCharacterLimit(user.roles) ? (
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
              {hasPatronCharacterLimit(user.roles)
                ? `Patron-level accounts can keep up to ${characterLimit} characters.`
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
          <CharacterRosterGrid
            emptyMessage="No characters yet. Create one to begin your logsheet roster."
            playerRoster={playerRoster}
            scrollable
            showDivider={false}
          />
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
          <TwoRowScrollableGrid className="homepage-open-games-grid">
            {openLeagueGames.length ? (
              openLeagueGames.map((game) => {
                const signedUpCount = game._count.participants;
                const canAddToCart = game.isGrimTidings || isPaidTicketPrice(game.ticketPrice);

                return (
                  <article
                    data-two-row-grid-item
                    key={game.id}
                    className="homepage-open-game-card"
                  >
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
                      </dl>

                      <div className="homepage-open-game-card-actions">
                        <Link
                          className="button button-secondary button-small"
                          href={`/league/games/${game.id}`}
                        >
                          View game
                        </Link>
                        {canAddToCart ? (
                          <Link
                            className="button button-small"
                            href={`/league/cart?games=${encodeURIComponent(game.id)}`}
                          >
                            Add to cart
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty">No open league games are scheduled right now.</div>
            )}
          </TwoRowScrollableGrid>
        </div>
      </section>
    </main>
  );
}
