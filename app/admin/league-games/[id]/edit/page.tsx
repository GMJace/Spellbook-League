import { notFound, redirect } from "next/navigation";

import { AdminLeagueGameEditForm } from "@/components/admin-league-game-edit-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { requireAdminUser } from "@/lib/admin";
import { getParticipantCharacterLabel } from "@/lib/game-participants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function AdminLeagueGameEditPage({ params }: PageProps) {
  await requireAdminUser();

  const { id } = await params;
  const [players, game] = await Promise.all([
    prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: "PLAYER",
          },
        },
      },
      include: {
        characters: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.game.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: true,
            character: true,
          },
          orderBy: [{ user: { name: "asc" } }, { createdAt: "asc" }],
        },
      },
    }),
  ]);

  if (!game) {
    notFound();
  }

  const initialValues = {
    id: game.id,
    title: game.title,
    adventureCode: game.adventureCode,
    source: game.source,
    gameSummary: game.gameSummary,
    ticketPrice: game.ticketPrice,
    adventureImagePath: game.adventureImagePath,
    consumablesAwarded: game.consumablesAwarded,
    datePlayed: formatDateInput(game.datePlayed),
    duration: game.duration,
    downtimeDaysAwarded: String(game.downtimeDaysAwarded ?? 0),
    magicItemsAwarded: game.magicItemsAwarded,
    spellbookAwarded: game.spellbookAwarded,
    participants: game.participants.map((participant) => ({
      characterId: participant.characterId,
      characterName: getParticipantCharacterLabel(participant.character?.name),
      userId: participant.userId,
      userName: participant.user.name,
    })),
    rewardsSummary: game.rewardsSummary,
    seatCapacity: String(game.seatCapacity),
    serviceHours: String(game.serviceHours ?? 0),
    sessionNotes: game.sessionNotes,
    status: game.status,
    tier: game.tier,
  };

  const playersForForm = players.map((player) => ({
    id: player.id,
    name: player.name,
    characters: player.characters.map((character) => ({
      id: character.id,
      name: character.name,
    })),
  }));

  return (
    <main className="page-shell">
      <section className="stack">
        <AdminPageHeader
          description="Update the game details, seats, rewards, and participants for this league listing."
          title="Edit open league game"
        />

        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Game details</h2>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                Update the schedule, rewards, seats, and participant details for this listing.
              </p>
            </div>
          </div>

          <AdminLeagueGameEditForm
            initialValuesJson={JSON.stringify(initialValues)}
            playersJson={JSON.stringify(playersForForm)}
          />
        </div>
      </section>
    </main>
  );
}
