// @ts-nocheck
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { deleteGame } from "@/app/dm/games/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { getParticipantCharacterLabel } from "@/lib/game-participants";
import { prisma } from "@/lib/prisma";
import { parseStoredGameSummary } from "@/lib/game-summary";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DmGameDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const isDm = currentUser.roles.some((entry: { role: string }) => entry.role === "DM");

  if (!isDm) {
    redirect("/");
  }

  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      dm: true,
      participants: {
        include: {
          user: true,
          character: true,
        },
        orderBy: [{ user: { name: "asc" } }, { createdAt: "asc" }],
      },
    },
  });

  if (!game) {
    notFound();
  }

  if (game.dmId !== currentUser.id) {
    redirect("/dm");
  }

  const availableSpots = Math.max((game.seatCapacity ?? 0) - game.participants.length, 0);
  const parsedGameSummary = parseStoredGameSummary(game.gameSummary);
  const sortedParticipants = [...game.participants].sort(
    (left, right) =>
      left.user.name.localeCompare(right.user.name) ||
      getParticipantCharacterLabel(left.character?.name).localeCompare(
        getParticipantCharacterLabel(right.character?.name),
      ),
  );

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Game record</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>{game.title}</h1>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="button button-secondary" href="/dm">
              Back
            </Link>
            <Link className="button" href={`/dm/games/${game.id}/edit`}>
              Edit game
            </Link>
            <form action={deleteGame}>
              <input name="gameId" type="hidden" value={game.id} />
              <ConfirmSubmitButton
                className="button button-danger"
                message={`Delete ${game.title}? This cannot be undone.`}
              >
                Delete game
              </ConfirmSubmitButton>
            </form>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Game summary</h2>
          </div>

          <div className="ggcon-game-hero-card regular-game-hero-card">
            {game.adventureImagePath ? (
              <img
                alt={`${game.title} cover art`}
                className="ggcon-game-cover-image regular-game-cover-image"
                src={game.adventureImagePath}
              />
            ) : (
              <div className="ggcon-game-hero-placeholder regular-game-cover-image">
                <div className="ggcon-game-hero-placeholder-inner">
                  <p className="eyebrow" style={{ margin: 0 }}>Adventure Art</p>
                  <strong>{game.title}</strong>
                  <p className="muted" style={{ margin: 0 }}>
                    Image placeholder
                  </p>
                </div>
              </div>
            )}

            <div className="stack">
              <div className="stack" style={{ gap: "0.45rem" }}>
                <p className="eyebrow">Game Snapshot</p>
                {parsedGameSummary.isStructured ? (
                  <div className="stack" style={{ gap: "0.75rem" }}>
                    {parsedGameSummary.gameSummary ? (
                      <div className="stack" style={{ gap: "0.35rem" }}>
                        <strong>Game summary</strong>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                          {parsedGameSummary.gameSummary}
                        </p>
                      </div>
                    ) : null}
                    {parsedGameSummary.themes.length ? (
                      <div className="stack" style={{ gap: "0.35rem" }}>
                        <strong>Themes</strong>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                          {parsedGameSummary.themes.map((line) => (
                            <li key={`theme-${line}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {parsedGameSummary.contentAdvisories.length ? (
                      <div className="stack" style={{ gap: "0.35rem" }}>
                        <strong>Content Advisories</strong>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                          {parsedGameSummary.contentAdvisories.map((line) => (
                            <li key={`content-advisory-${line}`}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : parsedGameSummary.legacyLines.length ? (
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                    {parsedGameSummary.legacyLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : parsedGameSummary.gameSummary ? (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{parsedGameSummary.gameSummary}</p>
                ) : null}
                <p className="muted" style={{ margin: 0 }}>
                  {game.adventureCode} ·{" "}
                  <LocalizedEventTime isoString={game.datePlayed.toISOString()} />
                </p>
              </div>

              <div className="ggcon-summary-metrics">
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Dungeon Master</span>
                  <strong>{game.dm.name}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Tier</span>
                  <strong>{game.tier.replaceAll("_", " ")}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Price</span>
                  <strong>{game.ticketPrice}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Duration</span>
                  <strong>{game.duration || "TBD"}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Source (DM&apos;s Guild link)</span>
                  <strong>{game.source || "Not recorded"}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Status</span>
                  <strong>{game.status.replaceAll("_", " ")}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Players</span>
                  <strong>{game.participants.length}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Available spots</span>
                  <strong>
                    {availableSpots} of {game.seatCapacity ?? 0}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Session details</h2>
          </div>

          <div className="stack">
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Rewards summary
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{game.rewardsSummary}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Downtime days awarded
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{game.downtimeDaysAwarded ?? 0}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Magic items awarded
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {game.magicItemsAwarded || "None recorded"}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Consumables awarded
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {game.consumablesAwarded || "None recorded"}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Spellbooks awarded
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {game.spellbookAwarded || "None recorded"}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Session notes
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{game.sessionNotes}</p>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Participants</h2>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Character</th>
                  <th>Logsheet</th>
                </tr>
              </thead>
              <tbody>
                {game.participants.length ? (
                  sortedParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.user.name}</td>
                      <td>{getParticipantCharacterLabel(participant.character?.name)}</td>
                      <td>
                        {participant.characterId ? (
                          <Link
                            className="button button-secondary button-small"
                            href={`/player/characters/${participant.characterId}`}
                          >
                            View logsheet
                          </Link>
                        ) : (
                          <span className="muted">No character yet</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={3}>
                      No participants recorded.
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
