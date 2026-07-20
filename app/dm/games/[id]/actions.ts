// @ts-nocheck
"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { convertImageFileToDataUrl } from "@/lib/image-data-url";
import { gameParticipantsSchema, gameSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

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

export async function updateGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/dm");
  }

  const { game } = await requireOwnedGame(gameId);
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
  let adventureImagePath = game.adventureImagePath;

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

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: {
        id: game.id,
      },
      data: {
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        tier: parsed.data.tier,
        serviceHours: parsed.data.serviceHours,
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

    await tx.gameParticipant.createMany({
      data: parsed.data.participants.map((participant) => ({
        gameId: game.id,
        characterId: participant.characterId,
        userId: participant.userId,
      })),
    });
  });

  redirect(`/dm/games/${game.id}`);
}

export async function deleteGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/dm");
  }

  const { game } = await requireOwnedGame(gameId);

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

  redirect("/dm");
}
