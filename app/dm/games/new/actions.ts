// @ts-nocheck
"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
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

export async function createGame(formData: FormData) {
  const user = await requireRole("DM");
  const participantsRaw = String(formData.get("participants") ?? "[]");
  let parsedParticipantsSource: unknown = [];

  try {
    parsedParticipantsSource = JSON.parse(participantsRaw);
  } catch {
    return { error: "Please complete all game fields and add at least one participant." };
  }

  const participantsResult = gameParticipantsSchema.safeParse(parsedParticipantsSource);

  if (!participantsResult.success) {
    return { error: "Please complete all game fields and add at least one participant." };
  }

  const parsed = gameSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    adventureCode: String(formData.get("adventureCode") ?? ""),
    datePlayed: String(formData.get("datePlayed") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    rewardsSummary: String(formData.get("rewardsSummary") ?? ""),
    magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
    consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
    sessionNotes: String(formData.get("sessionNotes") ?? ""),
    status: String(formData.get("status") ?? "SCHEDULED"),
    participants: participantsResult.data,
  });

  if (!parsed.success) {
    return { error: "Please complete all game fields and add at least one participant." };
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

  const seenCharacterIds = new Set<string>();

  for (const participant of parsed.data.participants) {
    if (seenCharacterIds.has(participant.characterId)) {
      return { error: "A character cannot be added to the same game twice." };
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
      return { error: "One or more selected participants are invalid." };
    }
  }

  const game = await prisma.$transaction(async (tx) => {
    const createdGame = await tx.game.create({
      data: {
        dmId: user.id,
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        tier: parsed.data.tier,
        serviceHours: parsed.data.serviceHours,
        rewardsSummary: parsed.data.rewardsSummary,
        magicItemsAwarded: parsed.data.magicItemsAwarded,
        consumablesAwarded: parsed.data.consumablesAwarded,
        consequencesSummary: "",
        sessionNotes: parsed.data.sessionNotes,
        status: parsed.data.status,
      },
    });

    await tx.gameParticipant.createMany({
      data: parsed.data.participants.map((participant) => ({
        gameId: createdGame.id,
        characterId: participant.characterId,
        userId: participant.userId,
      })),
    });

    return createdGame;
  });

  redirect(`/dm/games/${game.id}`);
}
