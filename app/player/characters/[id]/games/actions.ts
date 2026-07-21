"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  buildStoredGameRewardStrings,
  hasStructuredGameRewardSelectionFields,
  readGameRewardSelectionsFromFormData,
} from "@/lib/game-reward-selections";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const playerGameLogSchema = z.object({
  title: z.string().trim().min(2).max(120),
  adventureCode: z.string().trim().min(2).max(40),
  datePlayed: z.string().min(1),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  dmName: z.string().trim().min(2).max(80),
  rewardsSummary: z.string().trim(),
  magicItemsAwarded: z.string().trim().max(1500).default(""),
  consumablesAwarded: z.string().trim().max(500).default(""),
  sessionNotes: z.string().trim(),
  status: z.literal("COMPLETED"),
});

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

async function requireOwnedCharacter(characterId: string) {
  const user = await requireRole("PLAYER");

  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      userId: true,
    },
  });

  if (!character) {
    redirect("/player");
  }

  return { user, character };
}

async function requireOwnedLoggedGame(characterId: string, gameId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const participant = await prisma.gameParticipant.findFirst({
    where: {
      characterId,
      userId: user.id,
      gameId,
      logStatus: "APPROVED",
      game: {
        status: "COMPLETED",
      },
    },
    include: {
      game: true,
      character: true,
    },
  });

  if (!participant) {
    redirect(`/player/characters/${characterId}`);
  }

  return { user, character, participant };
}

function getApprovedParticipantUpdate(status: "SCHEDULED" | "COMPLETED" | "CANCELLED") {
  return {
    logStatus: "APPROVED" as const,
    approvedAt: status === "COMPLETED" ? new Date() : null,
    logRewardsSummary: null,
    logMagicItemsAwarded: null,
    logConsumablesAwarded: null,
    logSessionNotes: null,
  };
}

function getSubmittedRewardStrings(formData: FormData) {
  if (!hasStructuredGameRewardSelectionFields(formData)) {
    return {
      magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
      consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
    };
  }

  return buildStoredGameRewardStrings(readGameRewardSelectionsFromFormData(formData));
}

export async function createPlayerGameLog(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);
  const rewardStrings = getSubmittedRewardStrings(formData);

  const parsed = playerGameLogSchema.safeParse({
    title: formData.get("title"),
    adventureCode: formData.get("adventureCode"),
    datePlayed: formData.get("datePlayed"),
    tier: formData.get("tier"),
    dmName: formData.get("dmName"),
    rewardsSummary: formData.get("rewardsSummary"),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    sessionNotes: formData.get("sessionNotes"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(`/player/characters/${characterId}/games/new?error=invalid`);
  }

  const participantDefaults = getApprovedParticipantUpdate(parsed.data.status);
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  const game = await prisma.$transaction(async (tx) => {
    const createdGame = await tx.game.create({
      data: {
        dmId: null,
        loggedByUserId: user.id,
        dmName: parsed.data.dmName,
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        adventureImagePath: null,
        datePlayed: new Date(parsed.data.datePlayed),
        tier: parsed.data.tier,
        serviceHours: 0,
        rewardsSummary: parsed.data.rewardsSummary,
        magicItemsAwarded: parsed.data.magicItemsAwarded,
        consumablesAwarded: parsed.data.consumablesAwarded,
        consequencesSummary: "",
        sessionNotes: parsed.data.sessionNotes,
        status: parsed.data.status,
      },
    });

    await tx.gameParticipant.create({
      data: {
        gameId: createdGame.id,
        characterId: character.id,
        userId: user.id,
        ...participantDefaults,
      },
    });

    await createNotification(tx, {
      userId: user.id,
      createdByUserId: user.id,
      type: "GAME_LOGGED",
      title: `Game log recorded: ${parsed.data.title}`,
      body: `You logged ${parsed.data.title} for ${character.name}.`,
      details: [
        { label: "Adventure", value: parsed.data.adventureCode },
        { label: "Date", value: formattedDate },
        { label: "Character", value: character.name },
        { label: "DM", value: parsed.data.dmName },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${character.id}`,
    });

    return createdGame;
  });

  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);

  redirect(`/player/characters/${characterId}?logged=1`);
}

export async function updatePlayerGameLog(
  formData: FormData
) {
  const characterId = String(formData.get("characterId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");

  if (!characterId || !gameId) {
    redirect("/player");
  }

  const { participant } = await requireOwnedLoggedGame(characterId, gameId);
  const rewardStrings = getSubmittedRewardStrings(formData);

  const parsed = playerGameLogSchema.safeParse({
    title: formData.get("title"),
    adventureCode: formData.get("adventureCode"),
    datePlayed: formData.get("datePlayed"),
    tier: formData.get("tier"),
    dmName: formData.get("dmName"),
    rewardsSummary: formData.get("rewardsSummary"),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    sessionNotes: formData.get("sessionNotes"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(
      `/player/characters/${characterId}/games/${gameId}/edit?error=invalid`
    );
  }

  const isPlayerManagedLog = participant.game.loggedByUserId === participant.userId;
  const participantDefaults = getApprovedParticipantUpdate(parsed.data.status);
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  await prisma.$transaction(async (tx) => {
    if (isPlayerManagedLog) {
      await tx.game.update({
        where: {
          id: participant.gameId,
        },
        data: {
          dmId: null,
          dmName: parsed.data.dmName,
          title: parsed.data.title,
          adventureCode: parsed.data.adventureCode,
          datePlayed: new Date(parsed.data.datePlayed),
          tier: parsed.data.tier,
          rewardsSummary: parsed.data.rewardsSummary,
          magicItemsAwarded: parsed.data.magicItemsAwarded,
          consumablesAwarded: parsed.data.consumablesAwarded,
          sessionNotes: parsed.data.sessionNotes,
          status: parsed.data.status,
        },
      });

      await tx.gameParticipant.update({
        where: {
          id: participant.id,
        },
        data: participantDefaults,
      });
    } else {
      await tx.gameParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          logStatus: "APPROVED",
          approvedAt: participant.approvedAt ?? new Date(),
          logRewardsSummary: parsed.data.rewardsSummary,
          logMagicItemsAwarded: parsed.data.magicItemsAwarded,
          logConsumablesAwarded: parsed.data.consumablesAwarded,
          logSessionNotes: parsed.data.sessionNotes,
        },
      });
    }

    await createNotification(tx, {
      userId: participant.userId,
      createdByUserId: participant.userId,
      type: "GAME_LOGGED",
      title: `Game log updated: ${parsed.data.title}`,
      body: `You updated the log for ${parsed.data.title}.`,
      details: [
        { label: "Adventure", value: parsed.data.adventureCode },
        { label: "Date", value: formattedDate },
        { label: "Character", value: participant.character.name },
        { label: "DM", value: parsed.data.dmName },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${characterId}`,
    });
  });

  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);
  revalidatePath(`/player/characters/${characterId}/games/${gameId}/edit`);
  revalidatePath(`/dm/games/${gameId}`);

  redirect(`/player/characters/${characterId}?updatedLog=1`);
}
