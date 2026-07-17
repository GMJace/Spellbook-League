// @ts-nocheck
"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createNotifications } from "@/lib/notifications";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gameParticipantsSchema, gameSchema } from "@/lib/validation";

const MAX_ADVENTURE_IMAGE_SIZE = 5 * 1024 * 1024;

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

const GAME_FIELD_LABELS: Record<string, string> = {
  title: "Game title",
  adventureCode: "Adventure code",
  gameSummary: "Game summary",
  ticketPrice: "Price",
  datePlayed: "Date and time",
  tier: "Tier",
  seatCapacity: "Player capacity",
  rewardsSummary: "Awarded Gold",
  sessionNotes: "Session notes/Story Awards",
  status: "Status",
};

function buildGameValidationError(
  issues: Array<{ path?: Array<string | number>; message?: string }>
) {
  const fields = Array.from(
    new Set(
      issues
        .map((issue) => {
          const path = issue.path?.[0];

          if (typeof path !== "string") {
            return null;
          }

          const explicitMessage = issue.message?.trim();

          if (explicitMessage && Object.values(GAME_FIELD_LABELS).includes(explicitMessage)) {
            return explicitMessage;
          }

          return GAME_FIELD_LABELS[path] ?? null;
        })
        .filter((field): field is string => Boolean(field))
    )
  );

  if (fields.length === 1) {
    return `Please complete this required field: ${fields[0]}.`;
  }

  if (fields.length > 1) {
    return `Please complete these required fields: ${fields.join(", ")}.`;
  }

  return "Please complete all required game fields.";
}

function buildParticipantSummaries(
  participants: Array<{ userId: string; characterId: string }>,
  playerMap: Map<string, { name: string; characters: Array<{ id: string; name: string }> }>
) {
  const grouped = new Map<
    string,
    { userId: string; userName: string; firstCharacterId: string; characterNames: string[] }
  >();

  for (const participant of participants) {
    const player = playerMap.get(participant.userId);
    const character = player?.characters.find((entry) => entry.id === participant.characterId);

    if (!player || !character) {
      continue;
    }

    const existing =
      grouped.get(participant.userId) ??
      {
        userId: participant.userId,
        userName: player.name,
        firstCharacterId: participant.characterId,
        characterNames: [],
      };

    existing.characterNames.push(character.name);
    grouped.set(participant.userId, existing);
  }

  return Array.from(grouped.values());
}

function buildExistingParticipantSummaries(
  participants: Array<{
    userId: string;
    characterId: string;
    user: { name: string };
    character: { name: string };
  }>
) {
  const grouped = new Map<
    string,
    { userId: string; userName: string; firstCharacterId: string; characterNames: string[] }
  >();

  for (const participant of participants) {
    const existing =
      grouped.get(participant.userId) ??
      {
        userId: participant.userId,
        userName: participant.user.name,
        firstCharacterId: participant.characterId,
        characterNames: [],
      };

    existing.characterNames.push(participant.character.name);
    grouped.set(participant.userId, existing);
  }

  return Array.from(grouped.values());
}

function getParticipantLogData(gameData: {
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  sessionNotes: string;
}) {
  if (gameData.status === "COMPLETED") {
    return {
      logStatus: "PENDING" as const,
      approvedAt: null,
      logRewardsSummary: gameData.rewardsSummary,
      logMagicItemsAwarded: gameData.magicItemsAwarded,
      logConsumablesAwarded: gameData.consumablesAwarded,
      logSessionNotes: gameData.sessionNotes,
    };
  }

  return {
    logStatus: "APPROVED" as const,
    approvedAt: null,
    logRewardsSummary: null,
    logMagicItemsAwarded: null,
    logConsumablesAwarded: null,
    logSessionNotes: null,
  };
}

async function saveAdventureImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return { error: "Adventure art must be an image file." } as const;
  }

  if (file.size > MAX_ADVENTURE_IMAGE_SIZE) {
    return { error: "Adventure art must be 5 MB or smaller." } as const;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".png";
  const directory = path.join(process.cwd(), "public", "uploads", "game-covers");
  const filename = `${crypto.randomUUID()}${extension.toLowerCase()}`;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);

  return { path: `/uploads/game-covers/${filename}` } as const;
}

async function parseGameForm(formData: FormData) {
  const participantsRaw = String(formData.get("participants") ?? "[]");
  let parsedParticipantsSource: unknown = [];

  try {
    parsedParticipantsSource = JSON.parse(participantsRaw);
  } catch {
    return { error: "Please complete all required game fields." } as const;
  }

  const participantsResult = gameParticipantsSchema.safeParse(parsedParticipantsSource);

  if (!participantsResult.success) {
    return { error: "Please complete all required game fields." } as const;
  }

  const parsed = gameSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    adventureCode: String(formData.get("adventureCode") ?? ""),
    gameSummary: String(formData.get("gameSummary") ?? ""),
    ticketPrice: String(formData.get("ticketPrice") ?? "Free"),
    datePlayed: String(formData.get("datePlayed") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    seatCapacity: String(formData.get("seatCapacity") ?? "6"),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    downtimeDaysAwarded: String(formData.get("downtimeDaysAwarded") ?? "0"),
    rewardsSummary: String(formData.get("rewardsSummary") ?? ""),
    magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
    consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
    sessionNotes: String(formData.get("sessionNotes") ?? ""),
    status: String(formData.get("status") ?? "SCHEDULED"),
    participants: participantsResult.data,
  });

  if (!parsed.success) {
    return { error: buildGameValidationError(parsed.error.issues) } as const;
  }

  const seenCharacterIds = new Set<string>();

  for (const participant of parsed.data.participants) {
    if (seenCharacterIds.has(participant.characterId)) {
      return { error: "A character cannot be added to the same game twice." } as const;
    }

    seenCharacterIds.add(participant.characterId);
  }

  const players = await prisma.user.findMany({
    where: {
      id: { in: parsed.data.participants.map((participant) => participant.userId) },
    },
    include: {
      roles: true,
      characters: true,
    },
  });

  const playerMap = new Map(players.map((player) => [player.id, player]));

  for (const participant of parsed.data.participants) {
    const selectedUser = playerMap.get(participant.userId);
    const hasRole = selectedUser?.roles.some((role) => role.role === "PLAYER");
    const ownsCharacter = selectedUser?.characters.some(
      (character) => character.id === participant.characterId
    );

    if (!selectedUser || !hasRole || !ownsCharacter) {
      return { error: "One or more selected participants are invalid." } as const;
    }
  }

  return { data: parsed.data, playerMap } as const;
}

async function requireOwnedGame(gameId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const isDm = currentUser.roles.some((entry: { role: string }) => entry.role === "DM");

  if (!isDm) {
    redirect("/");
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      dmId: true,
      adventureImagePath: true,
    },
  });

  if (!game || game.dmId !== currentUser.id) {
    redirect("/dm");
  }

  return { currentUser, game };
}

export async function createGame(formData: FormData) {
  const user = await requireRole("DM");
  const parsed = await parseGameForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const adventureImageFile = formData.get("adventureImage");
  let adventureImagePath: string | null = null;

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return { error: uploadResult.error };
    }

    adventureImagePath = uploadResult.path;
  }

  const participantLogData = getParticipantLogData(parsed.data);
  const participantSummaries = buildParticipantSummaries(
    parsed.data.participants,
    parsed.playerMap
  );
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  const game = await prisma.$transaction(async (tx) => {
    const createdGame = await tx.game.create({
      data: {
        dmId: user.id,
        loggedByUserId: user.id,
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        gameSummary: parsed.data.gameSummary,
        ticketPrice: parsed.data.ticketPrice,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        tier: parsed.data.tier,
        seatCapacity: parsed.data.seatCapacity,
        serviceHours: parsed.data.serviceHours,
        downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        rewardsSummary: parsed.data.rewardsSummary,
        magicItemsAwarded: parsed.data.magicItemsAwarded,
        consumablesAwarded: parsed.data.consumablesAwarded,
        consequencesSummary: "",
        sessionNotes: parsed.data.sessionNotes,
        status: parsed.data.status,
      },
    });

    if (parsed.data.participants.length) {
      await tx.gameParticipant.createMany({
        data: parsed.data.participants.map((participant) => ({
          gameId: createdGame.id,
          characterId: participant.characterId,
          userId: participant.userId,
          ...participantLogData,
        })),
      });
    }

    await createNotifications(tx, [
      {
        userId: user.id,
        createdByUserId: user.id,
        type: "GAME_CREATED",
        title: `Game created: ${parsed.data.title}`,
        body: `You created ${parsed.data.title} and registered ${participantSummaries.length} participant${participantSummaries.length === 1 ? "" : "s"}.`,
        details: [
          { label: "Adventure", value: parsed.data.adventureCode },
          { label: "Date", value: formattedDate },
          { label: "Status", value: parsed.data.status },
          { label: "Players", value: String(participantSummaries.length) },
        ],
        actionLabel: "View game",
        actionHref: `/dm/games/${createdGame.id}`,
      },
      ...participantSummaries
        .filter((participant) => participant.userId !== user.id)
        .map((participant) => ({
          userId: participant.userId,
          createdByUserId: user.id,
          type: "GAME_CREATED" as const,
          title: `Game signup confirmed: ${parsed.data.title}`,
          body: `${user.name} added ${participant.characterNames.join(", ")} to ${parsed.data.title}.`,
          details: [
            { label: "Adventure", value: parsed.data.adventureCode },
            { label: "Date", value: formattedDate },
            { label: "Characters", value: participant.characterNames.join(", ") },
            { label: "Status", value: parsed.data.status },
          ],
          actionLabel: "Open character",
          actionHref: `/player/characters/${participant.firstCharacterId}`,
        })),
    ]);

    return createdGame;
  });

  redirect(`/dm/games/${game.id}`);
}

export async function updateGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/dm");
  }

  const { currentUser, game } = await requireOwnedGame(gameId);
  const parsed = await parseGameForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const adventureImageFile = formData.get("adventureImage");
  let adventureImagePath = game.adventureImagePath;

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return { error: uploadResult.error };
    }

    adventureImagePath = uploadResult.path;
  }

  const participantLogData = getParticipantLogData(parsed.data);
  const previousParticipants = await prisma.gameParticipant.findMany({
    where: {
      gameId: game.id,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      character: {
        select: {
          name: true,
        },
      },
    },
  });
  const currentParticipantSummaries = buildParticipantSummaries(
    parsed.data.participants,
    parsed.playerMap
  );
  const previousParticipantSummaries = buildExistingParticipantSummaries(previousParticipants);
  const currentParticipantUserIds = new Set(
    currentParticipantSummaries.map((participant) => participant.userId)
  );
  const removedParticipantSummaries = previousParticipantSummaries.filter(
    (participant) => !currentParticipantUserIds.has(participant.userId)
  );
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: {
        id: game.id,
      },
      data: {
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        gameSummary: parsed.data.gameSummary,
        ticketPrice: parsed.data.ticketPrice,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        tier: parsed.data.tier,
        seatCapacity: parsed.data.seatCapacity,
        serviceHours: parsed.data.serviceHours,
        downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        rewardsSummary: parsed.data.rewardsSummary,
        magicItemsAwarded: parsed.data.magicItemsAwarded,
        consumablesAwarded: parsed.data.consumablesAwarded,
        sessionNotes: parsed.data.sessionNotes,
        status: parsed.data.status,
      },
    });

    await tx.gameParticipant.deleteMany({
      where: {
        gameId: game.id,
      },
    });

    if (parsed.data.participants.length) {
      await tx.gameParticipant.createMany({
        data: parsed.data.participants.map((participant) => ({
          gameId: game.id,
          characterId: participant.characterId,
          userId: participant.userId,
          ...participantLogData,
        })),
      });
    }

    await createNotifications(tx, [
      {
        userId: currentUser.id,
        createdByUserId: currentUser.id,
        type: "GAME_UPDATED",
        title: `Game updated: ${parsed.data.title}`,
        body: `You updated ${parsed.data.title}.`,
        details: [
          { label: "Adventure", value: parsed.data.adventureCode },
          { label: "Date", value: formattedDate },
          { label: "Status", value: parsed.data.status },
          { label: "Players", value: String(currentParticipantSummaries.length) },
        ],
        actionLabel: "View game",
        actionHref: `/dm/games/${game.id}`,
      },
      ...currentParticipantSummaries
        .filter((participant) => participant.userId !== currentUser.id)
        .map((participant) => ({
          userId: participant.userId,
          createdByUserId: currentUser.id,
          type: "GAME_UPDATED" as const,
          title: `Game updated: ${parsed.data.title}`,
          body: `${currentUser.name} updated a game involving ${participant.characterNames.join(", ")}.`,
          details: [
            { label: "Adventure", value: parsed.data.adventureCode },
            { label: "Date", value: formattedDate },
            { label: "Characters", value: participant.characterNames.join(", ") },
            { label: "Status", value: parsed.data.status },
          ],
          actionLabel: "Open character",
          actionHref: `/player/characters/${participant.firstCharacterId}`,
        })),
      ...removedParticipantSummaries
        .filter((participant) => participant.userId !== currentUser.id)
        .map((participant) => ({
          userId: participant.userId,
          createdByUserId: currentUser.id,
          type: "GAME_UPDATED" as const,
          title: `Removed from game: ${parsed.data.title}`,
          body: `${currentUser.name} removed ${participant.characterNames.join(", ")} from ${parsed.data.title}.`,
          details: [
            { label: "Adventure", value: parsed.data.adventureCode },
            { label: "Date", value: formattedDate },
            { label: "Characters", value: participant.characterNames.join(", ") },
          ],
          actionLabel: "View character log",
          actionHref: `/player/characters/${participant.firstCharacterId}`,
        })),
    ]);
  });

  redirect(`/dm/games/${game.id}`);
}

export async function deleteGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/dm");
  }

  const { currentUser, game } = await requireOwnedGame(gameId);
  const existingParticipants = await prisma.gameParticipant.findMany({
    where: {
      gameId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      character: {
        select: {
          name: true,
        },
      },
      game: {
        select: {
          title: true,
          adventureCode: true,
          datePlayed: true,
        },
      },
    },
  });
  const participantSummaries = buildExistingParticipantSummaries(existingParticipants);
  const deletedGame = existingParticipants[0]?.game;
  const formattedDate = deletedGame
    ? formatNotificationDate(deletedGame.datePlayed.toISOString())
    : "";

  await prisma.$transaction([
    prisma.notification.createMany({
      data: [
        {
          userId: currentUser.id,
          createdByUserId: currentUser.id,
          type: "GAME_DELETED",
          title: deletedGame?.title
            ? `Game deleted: ${deletedGame.title}`
            : "Game deleted",
          body: deletedGame?.title
            ? `You deleted ${deletedGame.title}.`
            : "You deleted one of your games.",
          detailsJson: JSON.stringify(
            [
              deletedGame?.adventureCode
                ? { label: "Adventure", value: deletedGame.adventureCode }
                : null,
              formattedDate ? { label: "Date", value: formattedDate } : null,
            ].filter(Boolean)
          ),
          actionLabel: null,
          actionHref: null,
          isRead: false,
        },
        ...participantSummaries
          .filter((participant) => participant.userId !== currentUser.id)
          .map((participant) => ({
            userId: participant.userId,
            createdByUserId: currentUser.id,
            type: "GAME_DELETED" as const,
            title: deletedGame?.title
              ? `Game removed: ${deletedGame.title}`
              : "Game removed",
            body: deletedGame?.title
              ? `A game involving ${participant.characterNames.join(", ")} was removed.`
              : `${participant.characterNames.join(", ")} were removed from a game.`,
            detailsJson: JSON.stringify(
              [
                deletedGame?.adventureCode
                  ? { label: "Adventure", value: deletedGame.adventureCode }
                  : null,
                formattedDate ? { label: "Date", value: formattedDate } : null,
                { label: "Characters", value: participant.characterNames.join(", ") },
              ].filter(Boolean)
            ),
            actionLabel: "Open character",
            actionHref: `/player/characters/${participant.firstCharacterId}`,
            isRead: false,
          })),
      ],
    }),
    prisma.gameParticipant.deleteMany({
      where: {
        gameId,
      },
    }),
    prisma.game.delete({
      where: {
        id: gameId,
      },
    }),
  ]);

  redirect("/dm");
}
