import "server-only";

import {
  type GrimoireEventSlot,
  type GrimoireGame,
  type GrimoireTier,
  type SeasonEvent,
} from "@/lib/grimoire";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SubmissionTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

type GrimoireEventRecord = {
  id: string;
  label: string;
  subtitle: string;
  date: Date;
  displayDate: string;
  theme: string;
  themeDetails: string;
  focus: string;
  ticketLabel: string;
  ticketPrice: string;
  ticketPriceUsd: number;
  finale: boolean;
};

type GrimoireGameRecord = {
  eventId: string;
  slug: string;
  title: string;
  summary: string;
  details: string;
  adventureImagePath: null | string;
  startAt: Date;
  dm: string;
  tier: SubmissionTier;
  ticketPrice: string;
  ticketPriceUsd: number;
  seatCapacity: number;
  gameCode: string | null;
};

type GrimoireSlotRecord = {
  id: string;
  eventId: string;
  slotKey: string;
  label: string;
  startAt: Date;
  endAt: Date;
  gameSlotCount: number;
};

type GrimoireSubmissionRecord = {
  id: string;
  name: string;
  title: string;
  gameCode: string | null;
  eventId: string;
  slotStartAt: Date;
  tier: SubmissionTier;
  seats: number;
  summary: string;
};

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function mapEventToSeasonEvent(event: GrimoireEventRecord): SeasonEvent {
  return {
    id: event.id,
    label: event.label,
    subtitle: event.subtitle,
    date: event.date.toISOString(),
    displayDate: event.displayDate,
    theme: event.theme,
    themeDetails: parseStringArray(event.themeDetails),
    focus: event.focus,
    ticketLabel: event.ticketLabel,
    ticketPrice: event.ticketPrice,
    ticketPriceUsd: event.ticketPriceUsd,
    finale: event.finale,
  };
}

function mapCuratedGameToGrimoireGame(game: GrimoireGameRecord): GrimoireGame {
  return {
    eventId: game.eventId,
    slug: game.slug,
    game: game.title,
    summary: game.summary,
    details: parseStringArray(game.details),
    adventureImagePath: game.adventureImagePath,
    startAt: game.startAt.toISOString(),
    dm: game.dm,
    tier: game.tier as GrimoireTier,
    ticketPrice: game.ticketPrice,
    ticketPriceUsd: game.ticketPriceUsd,
    seatCapacity: game.seatCapacity,
    signedUp: [],
    waitlist: [],
    gameCode: game.gameCode,
  };
}

function mapSlotToGrimoireEventSlot(slot: GrimoireSlotRecord): GrimoireEventSlot {
  return {
    id: slot.id,
    eventId: slot.eventId,
    slotKey: slot.slotKey,
    label: slot.label,
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    gameSlotCount: slot.gameSlotCount,
    filledGameSlots: 0,
    availableGameSlots: Math.max(slot.gameSlotCount, 0),
    isFull: slot.gameSlotCount <= 0,
  };
}

function buildSlotOccupancyMap(
  curatedGames: Array<{ startAt: Date }>,
  submissions: Array<{ slotStartAt: Date }>,
) {
  const occupancyByStart = new Map<string, number>();

  for (const curatedGame of curatedGames) {
    const key = curatedGame.startAt.toISOString();
    occupancyByStart.set(key, (occupancyByStart.get(key) ?? 0) + 1);
  }

  for (const submission of submissions) {
    const key = submission.slotStartAt.toISOString();
    occupancyByStart.set(key, (occupancyByStart.get(key) ?? 0) + 1);
  }

  return occupancyByStart;
}

function formatSubmissionGameDetails(submission: GrimoireSubmissionRecord) {
  const details = [
    submission.gameCode ? `Game code: ${submission.gameCode}` : null,
    "This table was added through the Grimoire DM submission board.",
    "Expanded player-facing details and ticket pricing will be posted soon.",
  ];

  return details.filter((detail): detail is string => Boolean(detail));
}

function buildSubmissionSlug(submissionId: string) {
  return `submission-${submissionId}`;
}

function mapSubmissionToGame(submission: GrimoireSubmissionRecord): GrimoireGame {
  return {
    eventId: submission.eventId,
    slug: buildSubmissionSlug(submission.id),
    game: submission.title,
    summary: submission.summary,
    details: formatSubmissionGameDetails(submission),
    startAt: submission.slotStartAt.toISOString(),
    dm: submission.name,
    tier: submission.tier as GrimoireTier,
    ticketPrice: "TBD",
    ticketPriceUsd: 0,
    seatCapacity: submission.seats,
    signedUp: [],
    waitlist: [],
    gameCode: submission.gameCode,
    isSubmission: true,
  };
}

export async function getSeasonSchedule() {
  const events = (await prisma.grimoireEvent.findMany({
    orderBy: { date: "asc" },
  })) as GrimoireEventRecord[];

  return events.map(mapEventToSeasonEvent);
}

export async function getNextGrimoireEvent() {
  const events = await getSeasonSchedule();
  const now = Date.now();

  return events.find((event) => new Date(event.date).getTime() >= now) ?? events[0] ?? null;
}

export async function getGrimoireEventById(eventId: string) {
  const event = (await prisma.grimoireEvent.findUnique({
    where: { id: eventId },
  })) as GrimoireEventRecord | null;

  return event ? mapEventToSeasonEvent(event) : null;
}

export async function getCuratedGamesForEvent(eventId: string) {
  const games = await prisma.$queryRaw<GrimoireGameRecord[]>(Prisma.sql`
    SELECT
      eventId,
      slug,
      title,
      summary,
      details,
      adventureImagePath,
      startAt,
      dm,
      tier,
      ticketPrice,
      ticketPriceUsd,
      seatCapacity,
      gameCode
    FROM GrimoireCuratedGame
    WHERE eventId = ${eventId}
    ORDER BY startAt ASC, createdAt ASC
  `);

  return games.map(mapCuratedGameToGrimoireGame);
}

export async function getCuratedGrimoireGameBySlug(slug: string) {
  const [game] = await prisma.$queryRaw<GrimoireGameRecord[]>(Prisma.sql`
    SELECT
      eventId,
      slug,
      title,
      summary,
      details,
      adventureImagePath,
      startAt,
      dm,
      tier,
      ticketPrice,
      ticketPriceUsd,
      seatCapacity,
      gameCode
    FROM GrimoireCuratedGame
    WHERE slug = ${slug}
    LIMIT 1
  `);

  return game ? mapCuratedGameToGrimoireGame(game) : null;
}

export async function getSlotsForEvent(eventId: string) {
  const [slots, curatedGames, submissions] = await Promise.all([
    prisma.grimoireEventSlot.findMany({
      where: { eventId },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    }) as Promise<GrimoireSlotRecord[]>,
    prisma.grimoireCuratedGame.findMany({
      where: { eventId },
      select: {
        startAt: true,
      },
    }),
    prisma.grimoireDmSubmission.findMany({
      where: {
        eventId,
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
      select: {
        slotStartAt: true,
      },
    }),
  ]);

  const occupancyByStart = buildSlotOccupancyMap(curatedGames, submissions);

  return slots.map((slot) => {
    const mappedSlot = mapSlotToGrimoireEventSlot(slot);
    const filledGameSlots = occupancyByStart.get(slot.startAt.toISOString()) ?? 0;
    const availableGameSlots = Math.max(slot.gameSlotCount - filledGameSlots, 0);

    return {
      ...mappedSlot,
      filledGameSlots,
      availableGameSlots,
      isFull: availableGameSlots <= 0,
    };
  });
}

export async function getMergedGamesForEvent(eventId: string) {
  const curatedGames = await getCuratedGamesForEvent(eventId);
  const submissions = (await prisma.grimoireDmSubmission.findMany({
    where: {
      eventId,
      status: "APPROVED",
    },
    orderBy: [{ slotStartAt: "asc" }, { createdAt: "asc" }],
  })) as GrimoireSubmissionRecord[];

  return [...curatedGames, ...submissions.map(mapSubmissionToGame)].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  );
}

export async function getMergedGrimoireGameBySlug(slug: string) {
  const curatedGame = await getCuratedGrimoireGameBySlug(slug);

  if (curatedGame) {
    return curatedGame;
  }

  if (!slug.startsWith("submission-")) {
    return null;
  }

  const submissionId = slug.replace(/^submission-/, "");

  if (!submissionId) {
    return null;
  }

  const submission = (await prisma.grimoireDmSubmission.findFirst({
    where: {
      id: submissionId,
      status: "APPROVED",
    },
  })) as GrimoireSubmissionRecord | null;

  return submission ? mapSubmissionToGame(submission) : null;
}
