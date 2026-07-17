// @ts-nocheck
import { DmGameCreationSwitcher } from "@/components/dm-game-creation-switcher";
import { requireRole } from "@/lib/auth";
import { getLeaguePlayers } from "@/lib/data";
import { getNextGrimoireEvent, getSeasonSchedule, getSlotsForEvent } from "@/lib/grimoire-server";

export default async function NewGamePage() {
  const user = await requireRole("DM");
  const players = await getLeaguePlayers();
  const nextEvent = await getNextGrimoireEvent();
  const publishedEvents = (await getSeasonSchedule()).filter(
    (event) => new Date(event.date).getTime() >= Date.now()
  );
  const slotPairs = await Promise.all(
    publishedEvents.map(async (event) => [event.id, await getSlotsForEvent(event.id)] as const)
  );
  const slotsByEvent = Object.fromEntries(slotPairs);
  const playersForForm = players.map((player) => ({
    id: player.id,
    name: player.name,
    characters: player.characters.map((character) => ({
      id: character.id,
      name: character.name,
    })),
  }));

  return (
    <main className="stack">
      <section className="panel stack">
        <p className="eyebrow" style={{ margin: 0 }}>Register game</p>
        <DmGameCreationSwitcher
          dmProfile={{
            discord: user.discordHandle ?? "",
            email: user.email ?? "",
            name: user.name ?? "",
          }}
          eventOptions={publishedEvents}
          initialEventId={nextEvent?.id}
          playersJson={JSON.stringify(playersForForm)}
          slotsByEvent={slotsByEvent}
        />
      </section>
    </main>
  );
}
