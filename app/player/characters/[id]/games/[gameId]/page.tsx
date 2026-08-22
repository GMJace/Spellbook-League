import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getParticipantCharacterLabel } from "@/lib/game-participants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatOptionalText(value: string | null | undefined) {
  return value?.trim() ? value : "Not added";
}

export default async function PlayerGameLogDetailPage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id, gameId } = await params;

  const participant = await prisma.gameParticipant.findFirst({
    where: {
      characterId: id,
      userId: user.id,
      gameId,
      logStatus: "APPROVED",
      game: {
        status: "COMPLETED",
      },
    },
    include: {
      character: {
        select: {
          id: true,
          name: true,
        },
      },
      game: true,
    },
  });

  if (!participant) {
    notFound();
  }

  const characterLabel = getParticipantCharacterLabel(participant.character?.name);
  const isDmManagedLog = participant.game.loggedByUserId !== user.id;
  const effectiveRewardsSummary =
    participant.logRewardsSummary ?? participant.game.rewardsSummary;
  const effectiveMagicItemsAwarded =
    participant.logMagicItemsAwarded ?? participant.game.magicItemsAwarded;
  const effectiveConsumablesAwarded =
    participant.logConsumablesAwarded ?? participant.game.consumablesAwarded;
  const effectiveSpellbookAwarded =
    participant.logSpellbookAwarded ?? participant.game.spellbookAwarded;
  const effectiveSessionNotes =
    participant.logSessionNotes ?? participant.game.sessionNotes;

  return (
    <main className="stack">
      <section className="panel stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Character logsheet</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>View logged game for {characterLabel}</h1>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              {isDmManagedLog
                ? "This shows the full effective log for this DM-submitted game, including your personal reward notes."
                : "This shows the full player-managed log entry for this game."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="button button-secondary" href={`/player/characters/${id}`}>
              Back
            </Link>
            <Link className="button" href={`/player/characters/${id}/games/${gameId}/edit`}>
              Edit log
            </Link>
          </div>
        </div>
      </section>

      <section className="panel stack">
        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Log details</h2>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Game title</span>
              <strong>{participant.game.title}</strong>
            </div>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Adventure code</span>
              <strong>{participant.game.adventureCode}</strong>
            </div>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Date played</span>
              <strong>{formatDate(participant.game.datePlayed)}</strong>
            </div>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Tier</span>
              <strong>{participant.game.tier.replaceAll("_", " ")}</strong>
            </div>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Dungeon Master</span>
              <strong>{formatOptionalText(participant.game.dmName)}</strong>
            </div>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Source (DM&apos;s Guild link)</span>
              <strong style={{ wordBreak: "break-word" }}>
                {formatOptionalText(participant.game.source)}
              </strong>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Rewards and notes</h2>
          </div>

          <div className="stack" style={{ gap: "1rem" }}>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Rewards summary
              </p>
              <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                {formatOptionalText(effectiveRewardsSummary)}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Magic items awarded
              </p>
              <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                {formatOptionalText(effectiveMagicItemsAwarded)}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Consumables awarded
              </p>
              <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                {formatOptionalText(effectiveConsumablesAwarded)}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Spellbooks awarded
              </p>
              <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                {formatOptionalText(effectiveSpellbookAwarded)}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Session notes
              </p>
              <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>
                {formatOptionalText(effectiveSessionNotes)}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
