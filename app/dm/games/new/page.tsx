// @ts-nocheck
import { DmGameCreationSwitcher } from "@/components/dm-game-creation-switcher";
import { requireRole } from "@/lib/auth";
import { getLeaguePlayers } from "@/lib/data";
import { getCharacterBuildMagicItemOptions, getLeagueLegalBlessingOptions, getLeagueLegalBoonOptions, getLeagueLegalCharmOptions, getLeagueLegalConsumableOptions, getLeagueLegalMagicItemOptions } from "@/lib/league-legal-choices";
import { getNextGrimoireEvent, getSeasonSchedule, getSlotsForEvent } from "@/lib/grimoire-server";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: Promise<{
    duplicateFrom?: string;
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

export default async function NewGamePage({ searchParams }: PageProps) {
  const user = await requireRole("DM");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const duplicateFrom = resolvedSearchParams?.duplicateFrom?.trim();
  const [
    players,
    nextEvent,
    seasonSchedule,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  ] = await Promise.all([
    getLeaguePlayers(),
    getNextGrimoireEvent(),
    getSeasonSchedule(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
  ]);
  const publishedEvents = seasonSchedule.filter(
    (event) => new Date(event.date).getTime() >= Date.now()
  );
  const slotPairs = await Promise.all(
    publishedEvents.map(async (event) => [event.id, await getSlotsForEvent(event.id)] as const)
  );
  const slotsByEvent = Object.fromEntries(slotPairs);
  const legalRewardsJson = JSON.stringify({
    legalBuildMagicItemOptions: getCharacterBuildMagicItemOptions(legalMagicItemOptions),
    legalCommonMagicItemOptions: legalMagicItemOptions.Common,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  });
  const duplicatedGame =
    duplicateFrom
      ? await prisma.game.findFirst({
          where: {
            id: duplicateFrom,
            dmId: user.id,
          },
          include: {
            participants: {
              include: {
                user: true,
                character: true,
              },
              orderBy: [{ user: { name: "asc" } }, { character: { name: "asc" } }],
            },
          },
        })
      : null;
  const playersForForm = players.map((player) => ({
    id: player.id,
    name: player.name,
    characters: player.characters.map((character) => ({
      id: character.id,
      name: character.name,
    })),
  }));
  const initialGameValues = duplicatedGame
    ? {
        title: duplicatedGame.title,
        adventureCode: duplicatedGame.adventureCode,
        gameSummary: duplicatedGame.gameSummary,
        ticketPrice: duplicatedGame.ticketPrice,
        datePlayed: "",
        tier: duplicatedGame.tier,
        seatCapacity: String(duplicatedGame.seatCapacity),
        serviceHours: String(duplicatedGame.serviceHours ?? 0),
        downtimeDaysAwarded: String(duplicatedGame.downtimeDaysAwarded ?? 0),
        rewardsSummary: duplicatedGame.rewardsSummary,
        magicItemsAwarded: duplicatedGame.magicItemsAwarded,
        consumablesAwarded: duplicatedGame.consumablesAwarded,
        sessionNotes: duplicatedGame.sessionNotes,
        status: "SCHEDULED" as const,
        adventureImagePath: duplicatedGame.adventureImagePath,
        participants: [],
      }
    : undefined;

  return (
    <main className="stack">
      <section className="panel stack">
        <p className="eyebrow" style={{ margin: 0 }}>
          {duplicatedGame ? "Duplicate game" : "Register game"}
        </p>
        {duplicatedGame ? (
          <p className="muted" style={{ margin: 0 }}>
            Duplicating <strong>{duplicatedGame.title}</strong>. The new game starts with no
            players, a fresh signup phase, and a blank date so you can schedule it for a new run.
          </p>
        ) : null}
        <DmGameCreationSwitcher
          dmProfile={{
            discord: user.discordHandle ?? "",
            email: user.email ?? "",
            name: user.name ?? "",
          }}
          eventOptions={publishedEvents}
          initialGameValues={initialGameValues}
          initialEventId={nextEvent?.id}
          legalRewardsJson={legalRewardsJson}
          playersJson={JSON.stringify(playersForForm)}
          slotsByEvent={slotsByEvent}
        />
      </section>
    </main>
  );
}
