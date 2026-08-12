import { PrismaClient, Tier } from "@prisma/client";

import { grimoireEventSlots, grimoireGames, seasonSchedule } from "../lib/grimoire";

const prisma = new PrismaClient();

function toTier(tier: string) {
  return tier as Tier;
}

async function main() {
  const [eventCount, slotCount, gameCount] = await Promise.all([
    prisma.grimoireEvent.count(),
    prisma.grimoireEventSlot.count(),
    prisma.grimoireCuratedGame.count(),
  ]);

  if (eventCount > 0 || slotCount > 0 || gameCount > 0) {
    console.log(
      `Skipping Grimoire backfill because data already exists (events: ${eventCount}, slots: ${slotCount}, games: ${gameCount}).`,
    );
    return;
  }

  for (const event of seasonSchedule) {
    await prisma.grimoireEvent.create({
      data: {
        id: event.id,
        label: event.label,
        subtitle: event.subtitle,
        date: new Date(event.date),
        displayDate: event.displayDate,
        theme: event.theme,
        themeDetails: JSON.stringify(event.themeDetails),
        focus: event.focus,
        ticketLabel: event.ticketLabel,
        ticketPrice: event.ticketPrice,
        ticketPriceUsd: event.ticketPriceUsd,
        finale: event.finale ?? false,
        slots: {
          create: grimoireEventSlots
            .filter((slot) => slot.eventId === event.id)
            .map((slot) => ({
              slotKey: slot.slotKey,
              label: slot.label,
              startAt: new Date(slot.startAt),
              endAt: new Date(slot.endAt),
              gameSlotCount: slot.gameSlotCount,
            })),
        },
        curatedGames: {
          create: grimoireGames
            .filter((game) => game.eventId === event.id)
            .map((game) => ({
              slug: game.slug,
              title: game.game,
              summary: game.summary,
              details: JSON.stringify(game.details),
              startAt: new Date(game.startAt),
              dm: game.dm,
              tier: toTier(game.tier),
              ticketPrice: game.ticketPrice,
              ticketPriceUsd: game.ticketPriceUsd,
              seatCapacity: game.seatCapacity,
              gameCode: game.gameCode ?? null,
            })),
        },
      },
    });
  }

  console.log(
    `Backfilled ${seasonSchedule.length} Grimoire events, ${grimoireEventSlots.length} slots, and ${grimoireGames.length} curated games.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
