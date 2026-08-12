// @ts-nocheck
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EditGameForm } from "@/components/edit-game-form";
import { getLeaguePlayers } from "@/lib/data";
import { getParticipantCharacterLabel } from "@/lib/game-participants";
import { getCharacterBuildMagicItemOptions, getLeagueLegalBlessingOptions, getLeagueLegalBoonOptions, getLeagueLegalCharmOptions, getLeagueLegalConsumableOptions, getLeagueLegalMagicItemOptions, getLeagueLegalMinorPropertyOptions } from "@/lib/league-legal-choices";
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

export default async function EditGamePage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { roles: true },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const isDm = currentUser.roles.some((entry: { role: string }) => entry.role === "DM");

  if (!isDm) {
    redirect("/");
  }

  const { id } = await params;

  const [
    players,
    game,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  ] = await Promise.all([
    getLeaguePlayers(),
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
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  if (!game) {
    notFound();
  }

  if (game.dmId !== currentUser.id) {
    redirect("/dm");
  }

  const initialValues = {
    id: game.id,
    title: game.title,
    adventureCode: game.adventureCode,
    gameSummary: game.gameSummary,
    ticketPrice: game.ticketPrice,
    hasTicketAccessCode: Boolean(game.ticketAccessCodeHash),
    adventureImagePath: game.adventureImagePath,
    consumablesAwarded: game.consumablesAwarded,
    datePlayed: formatDateInput(game.datePlayed),
    duration: game.duration,
    downtimeDaysAwarded: String(game.downtimeDaysAwarded ?? 0),
    magicItemsAwarded: game.magicItemsAwarded,
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
    <main className="stack">
      <section className="panel stack">
        <p className="eyebrow" style={{ margin: 0 }}>Edit game</p>
        <EditGameForm
          initialValuesJson={JSON.stringify(initialValues)}
          legalRewardsJson={legalRewardsJson}
          playersJson={JSON.stringify(playersForForm)}
        />
      </section>
    </main>
  );
}
