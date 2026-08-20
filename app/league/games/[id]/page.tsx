import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { getCharacterTier, getCharacterTotalLevel } from "@/lib/character";
import {
  getParticipantCharacterLabel,
  TBD_CHARACTER_OPTION_LABEL,
  TBD_CHARACTER_VALUE,
} from "@/lib/game-participants";
import { parseStoredGameSummary } from "@/lib/game-summary";
import { prisma } from "@/lib/prisma";
import { formatStatus, formatTier, isPaidTicketPrice } from "@/lib/utils";
import {
  leaveLeagueGame,
  signupForFreeLeagueGame,
  updateLeagueGameCharacterSelection,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    leave?: string;
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
      return "Please choose one of your characters or select TBD to sign up.";
    case "invalid-character":
      return "Please choose a valid character from your roster.";
    case "character-unavailable":
      return "That character is already assigned to this game.";
    case "wrong-tier":
      return "Choose a character whose tier matches this game.";
    case "updated":
      return "Your signup has been updated.";
    case "not-signed-up":
      return "You need to be signed up for this game before changing the character selection.";
    default:
      return null;
  }
}

function renderLeaveMessage(leaveState: string | undefined, supportEmail: string) {
  switch (leaveState) {
    case "success":
      return "You have been removed from this game.";
    case "refund-requested":
      return "You have been removed from this game. SPELLBOOK staff has been emailed to begin the refund review process.";
    case "refund-contact-required":
      return `You have been removed from this game, but the refund email could not be sent automatically. Please contact ${supportEmail} to begin the refund process.`;
    case "not-signed-up":
      return "You are not currently signed up for this game.";
    case "closed":
      return `This game is no longer open for online leave requests. Please contact ${supportEmail} for help.`;
    default:
      return null;
  }
}

export default async function LeagueGameDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  const supportEmail = process.env.LEAGUE_SUPPORT_EMAIL?.trim() || "trevor@spellbookrpg.games";

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
          orderBy: [{ user: { name: "asc" } }, { createdAt: "asc" }],
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
                class1Level: true,
                class2Level: true,
                class3Level: true,
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
  const isSignupOpen = game.status === "SCHEDULED";
  const playerSignup = player
    ? game.participants.find((participant) => participant.userId === player.id)
    : null;
  const canAddToCart =
    isSignupOpen &&
    isPaidTicketPrice(game.ticketPrice) &&
    availableSpots > 0 &&
    !playerSignup;
  const canJoinForFree = isSignupOpen && !isPaidTicketPrice(game.ticketPrice) && availableSpots > 0;
  const isPlayer = Boolean(player?.roles.some((role) => role.role === "PLAYER"));
  const eligibleCharacters =
    player?.characters.filter(
      (character) =>
        getCharacterTier(getCharacterTotalLevel(character)) === Number(game.tier.replace("TIER_", ""))
    ) ?? [];
  const sortedParticipants = [...game.participants].sort(
    (left, right) =>
      left.user.name.localeCompare(right.user.name) ||
      getParticipantCharacterLabel(left.character?.name).localeCompare(
        getParticipantCharacterLabel(right.character?.name),
      ),
  );
  const signupMessage = renderSignupMessage(resolvedSearchParams.signup);
  const leaveMessage = renderLeaveMessage(resolvedSearchParams.leave, supportEmail);
  const parsedGameSummary = parseStoredGameSummary(game.gameSummary);

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
                  <strong>{game.dm?.name ?? game.dmName ?? "SPELLBOOK DM"}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Tier</span>
                  <strong>{formatTier(game.tier)}</strong>
                </div>
                <div className="list-card stack" style={{ gap: "0.35rem" }}>
                  <span className="muted">Price</span>
                  <strong>{game.ticketPrice}</strong>
                  {game.ticketAccessCodeHash ? (
                    <span className="muted ggcon-meta-note">
                      Have an access code? Redeem it from the league cart.
                    </span>
                  ) : null}
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

              {playerSignup && isPlayer ? (
                <div className="list-card stack" style={{ gap: "0.75rem" }}>
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    <strong>Your signup</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      Signed up as{" "}
                      <strong>{getParticipantCharacterLabel(playerSignup.character?.name)}</strong>.
                    </p>
                  </div>

                  {signupMessage ? <p style={{ margin: 0 }}>{signupMessage}</p> : null}
                  {leaveMessage ? <p style={{ margin: 0 }}>{leaveMessage}</p> : null}

                  {isSignupOpen ? (
                    <>
                      <form
                        action={updateLeagueGameCharacterSelection}
                        className="stack"
                        style={{ gap: "0.75rem" }}
                      >
                        <input name="gameId" type="hidden" value={game.id} />
                        <label>
                          Character
                          <select
                            defaultValue={playerSignup.characterId ?? TBD_CHARACTER_VALUE}
                            name="characterId"
                            required
                          >
                            <option value={TBD_CHARACTER_VALUE}>{TBD_CHARACTER_OPTION_LABEL}</option>
                            {eligibleCharacters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="muted" style={{ margin: 0 }}>
                          Select TBD if you have not decided yet. You can assign a character later.
                        </p>
                        <div>
                          <button className="button button-secondary" type="submit">
                            Update signup
                          </button>
                        </div>
                      </form>

                      <p className="muted" style={{ margin: 0 }}>
                        {isPaidTicketPrice(game.ticketPrice)
                          ? "Leaving this game will remove your seat and email SPELLBOOK staff to begin refund review for any paid ticket tied to this signup."
                          : "Leaving this game will remove your seat immediately."}
                      </p>

                      <div>
                        <form action={leaveLeagueGame}>
                          <input name="gameId" type="hidden" value={game.id} />
                          <button className="button button-secondary" type="submit">
                            Leave this game
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <p className="muted" style={{ margin: 0 }}>
                      {game.status === "COMPLETED"
                        ? "This game has already been completed, so online signup changes are closed."
                        : "This game is no longer open for signup changes online."}
                    </p>
                  )}
                </div>
              ) : null}

              {isPaidTicketPrice(game.ticketPrice) && leaveMessage ? (
                <div className="list-card stack" style={{ gap: "0.75rem" }}>
                  <strong>Game signup update</strong>
                  <p style={{ margin: 0 }}>{leaveMessage}</p>
                </div>
              ) : null}

              {!isPaidTicketPrice(game.ticketPrice) && !playerSignup ? (
                <div className="list-card stack" style={{ gap: "0.75rem" }}>
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    <strong>Free game signup</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      Free games can be joined directly without using the cart.
                    </p>
                  </div>

                  {signupMessage ? <p style={{ margin: 0 }}>{signupMessage}</p> : null}
                  {leaveMessage ? <p style={{ margin: 0 }}>{leaveMessage}</p> : null}

                  {canJoinForFree && isPlayer ? (
                    <form action={signupForFreeLeagueGame} className="stack" style={{ gap: "0.75rem" }}>
                      <input name="gameId" type="hidden" value={game.id} />
                      <label>
                        Character
                        <select defaultValue={TBD_CHARACTER_VALUE} name="characterId" required>
                          <option value={TBD_CHARACTER_VALUE}>{TBD_CHARACTER_OPTION_LABEL}</option>
                          {eligibleCharacters.map((character) => (
                            <option key={character.id} value={character.id}>
                              {character.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="muted" style={{ margin: 0 }}>
                        Select TBD if you have not decided yet. TBD can join any tier and be
                        assigned later.
                      </p>
                      {!eligibleCharacters.length ? (
                        <p className="muted" style={{ margin: 0 }}>
                          You do not have a matching-tier character yet, so TBD is selected by
                          default.
                        </p>
                      ) : null}
                      <div>
                        <button className="button" type="submit">
                          Sign up for free
                        </button>
                      </div>
                    </form>
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
                  sortedParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.user.name}</td>
                      <td>{getParticipantCharacterLabel(participant.character?.name)}</td>
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
