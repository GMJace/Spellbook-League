import { notFound } from "next/navigation";
import {
  PlayerGameLogForm,
  type PlayerGameLogInitialValues,
} from "@/components/player-game-log-form";
import { requireRole } from "@/lib/auth";
import { getCharacterBuildMagicItemOptions, getLeagueLegalBlessingOptions, getLeagueLegalBoonOptions, getLeagueLegalCharmOptions, getLeagueLegalConsumableOptions, getLeagueLegalMagicItemOptions } from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EditPlayerGameLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; gameId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id, gameId } = await params;
  const query = await searchParams;

  const [
    participant,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  ] = await Promise.all([
    prisma.gameParticipant.findFirst({
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
    }),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
  ]);

  if (!participant) {
    notFound();
  }

  const isDmManagedLog = participant.game.loggedByUserId !== user.id;
  const initialValues: PlayerGameLogInitialValues = {
    title: participant.game.title,
    adventureCode: participant.game.adventureCode,
    datePlayed: formatDateInput(participant.game.datePlayed),
    tier: participant.game.tier,
    dmName: participant.game.dmName ?? "",
    rewardsSummary:
      participant.logRewardsSummary ?? participant.game.rewardsSummary,
    magicItemsAwarded:
      participant.logMagicItemsAwarded ?? participant.game.magicItemsAwarded,
    consumablesAwarded:
      participant.logConsumablesAwarded ?? participant.game.consumablesAwarded,
    sessionNotes:
      participant.logSessionNotes ?? participant.game.sessionNotes,
  };

  return (
    <main className="stack">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Character logsheet</p>
          <h1>Edit logged game for {participant.character.name}</h1>
          <p className="muted">
            {isDmManagedLog
              ? "Update your personal rewards and notes for this DM-submitted log entry."
              : "Update this player-managed log entry."}
          </p>
        </div>
      </section>

      <section className="panel stack">
        {query.error === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the game details.
          </p>
        ) : null}
        <PlayerGameLogForm
          characterId={id}
          gameId={gameId}
          initialValues={initialValues}
          legalBlessingOptions={legalBlessingOptions}
          legalBoonOptions={legalBoonOptions}
          legalBuildMagicItemOptions={getCharacterBuildMagicItemOptions(legalMagicItemOptions)}
          legalCharmOptions={legalCharmOptions}
          legalCommonMagicItemOptions={legalMagicItemOptions.Common}
          legalConsumableOptions={legalConsumableOptions}
          metadataLocked={isDmManagedLog}
          showTierField={false}
          submitLabel="Save changes"
        />
      </section>
    </main>
  );
}
