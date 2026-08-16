"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { canViewPrivateCharacterRoster } from "@/lib/character-visibility";
import { prisma } from "@/lib/prisma";

export type AwardAchievementState = {
  completedAt?: number;
  error?: string;
};

export async function awardAchievement(
  _previousState: AwardAchievementState,
  formData: FormData
): Promise<AwardAchievementState> {
  const user = await requireRole("DM");
  const canSeePrivateCharacters = await canViewPrivateCharacterRoster(user);
  const characterId = String(formData.get("characterId") ?? "").trim();
  const achievementId = String(formData.get("achievementId") ?? "").trim();
  const gameCode = String(formData.get("gameCode") ?? "").trim();
  const awardedOn = String(formData.get("awardedOn") ?? "").trim();

  if (!characterId || !achievementId) {
    return { error: "Missing character or achievement details." };
  }

  if (!awardedOn) {
    return { error: "Enter the game date before awarding this badge." };
  }

  if (!gameCode) {
    return { error: "Enter the game code before awarding this badge." };
  }

  const awardedAt = new Date(`${awardedOn}T12:00:00`);

  if (Number.isNaN(awardedAt.getTime())) {
    return { error: "Enter a valid game date." };
  }

  const [character, achievement] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, isPubliclyViewable: true },
    }),
    prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { id: true },
    }),
  ]);

  if (!character || !achievement) {
    return { error: "That character or badge could not be found." };
  }

  if (!character.isPubliclyViewable && !canSeePrivateCharacters) {
    return { error: "That character is not available in the current roster." };
  }

  await prisma.characterAchievement.create({
    data: {
      achievementId,
      characterId,
      awardedAt,
      awardedByUserId: user.id,
      gameCode,
    },
  });

  revalidatePath("/dm/achievements");
  revalidatePath(`/dm/achievements/award/${characterId}`);
  revalidatePath(`/player/characters/${characterId}`);

  return { completedAt: Date.now() };
}
