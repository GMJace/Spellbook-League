"use server";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/admin";
import { convertImageFileToDataUrl } from "@/lib/image-data-url";
import { prisma } from "@/lib/prisma";
import { gameParticipantsSchema, gameSchema } from "@/lib/validation";

const MAX_ADVENTURE_IMAGE_SIZE = 5 * 1024 * 1024;

async function saveAdventureImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return { error: "Adventure art must be an image file." } as const;
  }

  if (file.size > MAX_ADVENTURE_IMAGE_SIZE) {
    return { error: "Adventure art must be 5 MB or smaller." } as const;
  }

  return { path: await convertImageFileToDataUrl(file) } as const;
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
    duration: String(formData.get("duration") ?? ""),
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
    return { error: "Please complete all required game fields." } as const;
  }

  const seenCharacterIds = new Set<string>();

  for (const participant of parsed.data.participants) {
    if (participant.characterId && seenCharacterIds.has(participant.characterId)) {
      return { error: "A character cannot be added to the same game twice." } as const;
    }

    if (participant.characterId) {
      seenCharacterIds.add(participant.characterId);
    }
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
    const ownsCharacter = participant.characterId
      ? selectedUser?.characters.some((character) => character.id === participant.characterId)
      : true;

    if (!selectedUser || !hasRole || !ownsCharacter) {
      return { error: "One or more selected participants are invalid." } as const;
    }
  }

  return { data: parsed.data } as const;
}

async function requireAdminGame(gameId: string) {
  await requireAdminUser();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      title: true,
      adventureImagePath: true,
    },
  });

  if (!game) {
    redirect("/admin/league-games?game=invalid");
  }

  return game;
}

export async function adminUpdateLeagueGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/admin/league-games?game=invalid");
  }

  const game = await requireAdminGame(gameId);
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

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: game.id },
      data: {
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        gameSummary: parsed.data.gameSummary,
        ticketPrice: parsed.data.ticketPrice,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        duration: parsed.data.duration,
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
        })),
      });
    }
  });

  redirect("/admin/league-games?game=updated");
}

export async function adminDeleteLeagueGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/admin/league-games?game=invalid");
  }

  await requireAdminGame(gameId);

  await prisma.$transaction([
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

  redirect("/admin/league-games?game=deleted");
}
