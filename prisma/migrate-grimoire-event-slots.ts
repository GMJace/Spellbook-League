import { copyFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  type GrimoireTimeSlotKey,
  STANDARD_GRIMOIRE_TIME_SLOTS,
  buildStandardGrimoireEventSlots,
  formatGrimoireEventDateInput,
} from "../lib/grimoire-slots";

const prisma = new PrismaClient();

type EventRow = {
  id: string;
  date: Date | string;
};

type SlotRow = {
  id: string;
  eventId: string;
  label: string;
  startAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CuratedGameRow = {
  id: string;
  eventId: string;
  startAt: Date | string;
};

type SubmissionRow = {
  id: string;
  eventId: string;
  slotStartAt: Date | string;
};

type TableInfoRow = {
  name: string;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function getClosestSlotKey(
  date: Date,
  standardSlots: ReturnType<typeof buildStandardGrimoireEventSlots>,
) {
  if (!standardSlots?.length) {
    throw new Error("Standard Grimoire slot definitions are missing.");
  }

  let closestSlot = standardSlots[0];
  let closestDistance = Math.abs(date.getTime() - closestSlot.startAt.getTime());

  for (const slot of standardSlots.slice(1)) {
    const distance = Math.abs(date.getTime() - slot.startAt.getTime());

    if (distance < closestDistance) {
      closestSlot = slot;
      closestDistance = distance;
    }
  }

  return closestSlot.slotKey;
}

function createEmptyCountMap() {
  return Object.fromEntries(
    STANDARD_GRIMOIRE_TIME_SLOTS.map((slot) => [slot.key, 0]),
  ) as Record<GrimoireTimeSlotKey, number>;
}

async function backupDatabaseFile() {
  const databasePath = path.join(process.cwd(), "prisma", "dev.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${databasePath}.backup-${stamp}`;

  await copyFile(databasePath, backupPath);

  return backupPath;
}

async function main() {
  const tableInfo = await prisma.$queryRawUnsafe<TableInfoRow[]>(
    'PRAGMA table_info("GrimoireEventSlot")',
  );

  if (tableInfo.some((column) => column.name === "slotKey")) {
    console.log("GrimoireEventSlot already includes slotKey. No migration needed.");
    return;
  }

  const backupPath = await backupDatabaseFile();
  console.log(`Backed up prisma/dev.db to ${backupPath}`);

  const [events, existingSlots, curatedGames, submissions] = await Promise.all([
    prisma.$queryRawUnsafe<EventRow[]>(
      'SELECT id, date FROM "GrimoireEvent" ORDER BY date ASC',
    ),
    prisma.$queryRawUnsafe<SlotRow[]>(
      'SELECT id, eventId, label, startAt, createdAt, updatedAt FROM "GrimoireEventSlot" ORDER BY eventId ASC, startAt ASC, createdAt ASC',
    ),
    prisma.$queryRawUnsafe<CuratedGameRow[]>(
      'SELECT id, eventId, startAt FROM "GrimoireCuratedGame" ORDER BY eventId ASC, startAt ASC',
    ),
    prisma.$queryRawUnsafe<SubmissionRow[]>(
      'SELECT id, eventId, slotStartAt FROM "GrimoireDmSubmission" ORDER BY eventId ASC, slotStartAt ASC',
    ),
  ]);

  const eventPlans = events.map((event) => {
    const eventDate = toDate(event.date);
    const standardSlots = buildStandardGrimoireEventSlots(
      formatGrimoireEventDateInput(eventDate),
      createEmptyCountMap(),
    );

    if (!standardSlots) {
      throw new Error(`Could not build standard slots for event ${event.id}.`);
    }

    const eventSlots = existingSlots.filter((slot) => slot.eventId === event.id);
    const eventGames = curatedGames.filter((game) => game.eventId === event.id);
    const eventSubmissions = submissions.filter((submission) => submission.eventId === event.id);
    const countByKey = createEmptyCountMap();
    const occupancyByKey = createEmptyCountMap();
    const slotKeyByOriginalStart = new Map<string, GrimoireTimeSlotKey>();

    for (const slot of eventSlots) {
      const slotStartAt = toDate(slot.startAt);
      const slotKey = getClosestSlotKey(slotStartAt, standardSlots);

      slotKeyByOriginalStart.set(slotStartAt.toISOString(), slotKey);
      countByKey[slotKey] += 1;
    }

    for (const game of eventGames) {
      const gameStartAt = toDate(game.startAt);
      const slotKey =
        slotKeyByOriginalStart.get(gameStartAt.toISOString()) ??
        getClosestSlotKey(gameStartAt, standardSlots);

      occupancyByKey[slotKey] += 1;
      slotKeyByOriginalStart.set(gameStartAt.toISOString(), slotKey);
    }

    for (const submission of eventSubmissions) {
      const submissionStartAt = toDate(submission.slotStartAt);
      const slotKey =
        slotKeyByOriginalStart.get(submissionStartAt.toISOString()) ??
        getClosestSlotKey(submissionStartAt, standardSlots);

      occupancyByKey[slotKey] += 1;
      slotKeyByOriginalStart.set(submissionStartAt.toISOString(), slotKey);
    }

    const canonicalSlots = standardSlots.map((slot) => ({
      ...slot,
      id:
        eventSlots.find(
          (existingSlot) =>
            slotKeyByOriginalStart.get(toDate(existingSlot.startAt).toISOString()) === slot.slotKey,
        )?.id ?? `${event.id}-${slot.slotKey}`,
      createdAt:
        eventSlots.find(
          (existingSlot) =>
            slotKeyByOriginalStart.get(toDate(existingSlot.startAt).toISOString()) === slot.slotKey,
        )?.createdAt ?? new Date(),
      updatedAt: new Date(),
      gameSlotCount: Math.max(countByKey[slot.slotKey], occupancyByKey[slot.slotKey], 0),
    }));

    const startAtByOriginalStart = new Map<string, Date>();
    for (const [originalStart, slotKey] of slotKeyByOriginalStart.entries()) {
      const mappedSlot = canonicalSlots.find((slot) => slot.slotKey === slotKey);

      if (mappedSlot) {
        startAtByOriginalStart.set(originalStart, mappedSlot.startAt);
      }
    }

    return {
      event,
      canonicalSlots,
      eventGames,
      eventSubmissions,
      startAtByOriginalStart,
    };
  });

  await prisma.$executeRawUnsafe("BEGIN IMMEDIATE");

  try {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

    for (const plan of eventPlans) {
      for (const game of plan.eventGames) {
        const originalStart = toDate(game.startAt).toISOString();
        const mappedStartAt =
          plan.startAtByOriginalStart.get(originalStart) ??
          plan.canonicalSlots[0]?.startAt;

        if (!mappedStartAt) {
          continue;
        }

        await prisma.$executeRaw`
          UPDATE "GrimoireCuratedGame"
          SET "startAt" = ${mappedStartAt}
          WHERE "id" = ${game.id}
        `;
      }

      for (const submission of plan.eventSubmissions) {
        const originalStart = toDate(submission.slotStartAt).toISOString();
        const mappedStartAt =
          plan.startAtByOriginalStart.get(originalStart) ??
          plan.canonicalSlots[0]?.startAt;

        if (!mappedStartAt) {
          continue;
        }

        await prisma.$executeRaw`
          UPDATE "GrimoireDmSubmission"
          SET "slotStartAt" = ${mappedStartAt}
          WHERE "id" = ${submission.id}
        `;
      }

      if (plan.canonicalSlots[0]) {
        await prisma.$executeRaw`
          UPDATE "GrimoireEvent"
          SET "date" = ${plan.canonicalSlots[0].startAt}
          WHERE "id" = ${plan.event.id}
        `;
      }
    }

    await prisma.$executeRawUnsafe('ALTER TABLE "GrimoireEventSlot" RENAME TO "GrimoireEventSlot_old"');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "GrimoireEventSlot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventId" TEXT NOT NULL,
        "slotKey" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "startAt" DATETIME NOT NULL,
        "endAt" DATETIME NOT NULL,
        "gameSlotCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GrimoireEventSlot_eventId_fkey"
          FOREIGN KEY ("eventId") REFERENCES "GrimoireEvent" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    for (const plan of eventPlans) {
      for (const slot of plan.canonicalSlots) {
        await prisma.$executeRaw`
          INSERT INTO "GrimoireEventSlot" (
            "id",
            "eventId",
            "slotKey",
            "label",
            "startAt",
            "endAt",
            "gameSlotCount",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${slot.id},
            ${plan.event.id},
            ${slot.slotKey},
            ${slot.label},
            ${slot.startAt},
            ${slot.endAt},
            ${slot.gameSlotCount},
            ${toDate(slot.createdAt)},
            ${toDate(slot.updatedAt)}
          )
        `;
      }
    }

    await prisma.$executeRawUnsafe('DROP TABLE "GrimoireEventSlot_old"');
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "GrimoireEventSlot_eventId_slotKey_key" ON "GrimoireEventSlot"("eventId", "slotKey")',
    );
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "GrimoireEventSlot_eventId_startAt_key" ON "GrimoireEventSlot"("eventId", "startAt")',
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "GrimoireEventSlot_eventId_startAt_idx" ON "GrimoireEventSlot"("eventId", "startAt")',
    );
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    await prisma.$executeRawUnsafe("COMMIT");

    console.log(
      `Migrated ${existingSlots.length} existing Grimoire event slots into ${eventPlans.reduce(
        (total, plan) => total + plan.canonicalSlots.length,
        0,
      )} standard event time slots.`,
    );
  } catch (error) {
    await prisma.$executeRawUnsafe("ROLLBACK");
    throw error;
  }
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
