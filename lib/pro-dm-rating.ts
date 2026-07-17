import { prisma } from "@/lib/prisma";

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type RateDmGameOption = {
  id: string;
  game: string;
  date: string;
  optionLabel: string;
};

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getTodayDateInput(now: Date = new Date()) {
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(
    now.getDate()
  )}`;
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isValidDateInput(value: string) {
  if (!DATE_INPUT_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isFutureDateInput(value: string, today: string = getTodayDateInput()) {
  return value > today;
}

function buildRateDmGameLabel(game: { title: string; adventureCode: string | null }) {
  return [game.adventureCode?.trim(), game.title.trim()].filter(Boolean).join(" · ");
}

function toRateDmGameOption(game: {
  id: string;
  title: string;
  adventureCode: string | null;
  datePlayed: Date;
}): RateDmGameOption | null {
  const date = formatDateInput(game.datePlayed);

  if (!isValidDateInput(date) || isFutureDateInput(date)) {
    return null;
  }

  const gameLabel = buildRateDmGameLabel(game);

  return {
    id: game.id,
    game: gameLabel,
    date,
    optionLabel: `${gameLabel} (${date})`,
  };
}

export async function getRateDmGameOptions(dmId: string, reviewerUserId: string) {
  const games = await prisma.game.findMany({
    where: {
      dmId,
      status: "COMPLETED",
      participants: {
        some: {
          userId: reviewerUserId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      adventureCode: true,
      datePlayed: true,
    },
    orderBy: [{ datePlayed: "desc" }, { title: "asc" }],
  });

  return games
    .map((game) => toRateDmGameOption(game))
    .filter((game): game is RateDmGameOption => Boolean(game));
}

export async function getRateDmGameOptionById(
  dmId: string,
  reviewerUserId: string,
  gameId: string
) {
  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      dmId,
      status: "COMPLETED",
      participants: {
        some: {
          userId: reviewerUserId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      adventureCode: true,
      datePlayed: true,
    },
  });

  return game ? toRateDmGameOption(game) : null;
}
