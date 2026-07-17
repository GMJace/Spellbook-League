import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { prisma } from "@/lib/prisma";
import { formatStatus, formatTier, isPaidTicketPrice, splitBulletLines } from "@/lib/utils";
import { signupForFreeLeagueGame } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    signup?: string;
  }>;
};

function renderSignupMessage(signupState: string | undefined) {
  switch (signupState) {
    case "success":
      return "You are signed up for this free league game.";
    case "already":
      return "You are already signed up for this game.";
    case "full":
      return "This game is currently full.";
    case "closed":
      return "This game is no longer open for signup.";
    case "paid":
      return "This game requires checkout through the cart.";
    case "choose-character":
      return "Please choose one of your characters to sign up.";
    case "invalid-character":
      return "Please choose a valid character from your roster.";
    default:
      return null;
  }
}

export default async function LeagueGameDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();

  const [game, player] = await Promise.all([
    prisma.game.findUnique({
      where: { id },
      include: {
        dm: true,
        participants: {
          include: {
            character: true,
            user: true,
          },
          orderBy: [{ user: { name: "asc" } }, { character: { name: "asc" } }],
        },
      },
    }),
    session?.user?.id
      ? prisma.user.findUnique({
          where: {
            id: session.user.id,
          },
          include: {
            roles: true,
            characters: {
              select: {
                id: true,
                name: true,
              },
              orderBy: {
                name: "asc",
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!game) {
    notFound();
  }

  const availableSpots = Math.max((game.seatCapacity ?? 0) - game.participants.length, 0);
  const canAddToCart = isPaidTicketPrice(game.ticketPrice) && availableSpots > 0;
  const canJoinForFree = !isPaidTicketPrice(game.ticketPrice) && availableSpots > 0;
  const isPlayer = Boolean(player?.roles.some((role) => role.role === "PLAYER"));
  const playerSignup = player
    ? game.participants.find((participant) => participant.userId === player.id)
    : null;
  const signupMessage = renderSignupMessage(resolvedSearchParams.signup);
  const gameSummaryLines = splitBulletLines(game.gameSummary);

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">League Game</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>{game.title}</h1>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="button button-secondary" href="/">
              Back
            </Link>
            {canAddToCart ? (
              <Link className="button" href={`/league/cart?games=${encodeURIComponent(game.id)}`}>
                Add ticket to cart
              </Link>
            ) : null}
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
                {gameSummaryLines.length ? (
                  <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                    {gameSummaryLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="muted" style={{ margin: 0 }}>
                  {game.adventureCode} ·{" "}
                  <LocalizedEventTime isoString={game.datePlayed.toISOString()} />
                </p>
              </div>

              <div className="ggcon-summary-metrics">
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Dungeon Master</span>
                  <strong>{game.dm?.name ?? game.dmName ?? "SPELLBOOK DM"}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Tier</span>
                  <strong>{formatTier(game.tier)}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Price</span>
                  <strong>{game.ticketPrice}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Status</span>
                  <strong>{formatStatus(game.status)}</strong>
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

              {!isPaidTicketPrice(game.ticketPrice) ? (
                <div className="list-card stack" style={{ gap: "0.75rem" }}>
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    <strong>Free game signup</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      Free games can be joined directly without using the cart.
                    </p>
                  </div>

                  {signupMessage ? <p style={{ margin: 0 }}>{signupMessage}</p> : null}

                  {playerSignup ? (
                    <p style={{ margin: 0 }}>
                      Signed up as <strong>{playerSignup.character.name}</strong>.
                    </p>
                  ) : canJoinForFree && isPlayer && player?.characters.length ? (
                    <form action={signupForFreeLeagueGame} className="stack" style={{ gap: "0.75rem" }}>
                      <input name="gameId" type="hidden" value={game.id} />
                      <label>
                        Character
                        <select defaultValue={player.characters[0]?.id ?? ""} name="characterId" required>
                          {player.characters.map((character) => (
                            <option key={character.id} value={character.id}>
                              {character.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div>
                        <button className="button" type="submit">
                          Sign up for free
                        </button>
                      </div>
                    </form>
                  ) : canJoinForFree && isPlayer ? (
                    <div className="stack" style={{ gap: "0.6rem" }}>
                      <p style={{ margin: 0 }}>
                        Create a character before signing up for this game.
                      </p>
                      <div>
                        <Link className="button" href="/player/characters/new">
                          Create character
                        </Link>
                      </div>
                    </div>
                  ) : canJoinForFree && session?.user?.id ? (
                    <p style={{ margin: 0 }}>
                      Only player accounts can sign up directly for free games.
                    </p>
                  ) : canJoinForFree ? (
                    <div className="stack" style={{ gap: "0.6rem" }}>
                      <p style={{ margin: 0 }}>
                        Sign in with a player account to join this free game.
                      </p>
                      <div>
                        <Link className="button" href="/login">
                          Sign in
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Free signup is unavailable because this game has no open spots.
                    </p>
                  )}
                </div>
              ) : null}
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
                Awarded Gold
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{game.rewardsSummary || "None recorded"}</p>
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
                Session notes
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{game.sessionNotes || "No notes recorded."}</p>
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
                </tr>
              </thead>
              <tbody>
                {game.participants.length ? (
                  game.participants.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.user.name}</td>
                      <td>{participant.character.name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={2}>
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
