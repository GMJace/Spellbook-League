"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/admin";
import {
  getAchievementBadgeUpload,
  removeAchievementBadgeUpload,
  saveAchievementBadgeUpload,
} from "@/lib/achievement-badge-upload";
import { prisma } from "@/lib/prisma";

const DEFAULT_ACHIEVEMENT_CATEGORY = "Achievements";

type AchievementMutationValues = {
  badgeImagePath: string | null;
  category: string;
  description: string;
  name: string;
  slug: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function slugifyAchievement(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAchievementValues(formData: FormData): AchievementMutationValues | null {
  const name = normalizeText(formData.get("name"));
  const category = normalizeText(formData.get("category")) || DEFAULT_ACHIEVEMENT_CATEGORY;
  const description = normalizeText(formData.get("description"));
  const slug = slugifyAchievement(name);
  const badgeImagePath = normalizeText(formData.get("badgeImagePath")) || null;

  if (!name || !category || !description || !slug) {
    return null;
  }

  return {
    badgeImagePath,
    category,
    description,
    name,
    slug,
  };
}

function requireAchievementValues(formData: FormData): AchievementMutationValues {
  const values = buildAchievementValues(formData);

  if (!values) {
    redirectToAdminAchievements("invalid");
  }

  return values;
}

function revalidateAchievementPages() {
  revalidatePath("/admin/achievements");
  revalidatePath("/dm/achievements");
  revalidatePath("/dm/achievements/award/[characterId]", "page");
  revalidatePath("/player");
  revalidatePath("/player/characters/[id]", "page");
}

function getSelectedAchievementId(formData: FormData) {
  return normalizeText(formData.get("selectedAchievementId"));
}

function redirectToAdminAchievements(
  status: string,
  selectedAchievementId?: string,
): never {
  const searchParams = new URLSearchParams({
    achievement: status,
  });

  if (selectedAchievementId) {
    searchParams.set("selected", selectedAchievementId);
  }

  redirect(`/admin/achievements?${searchParams.toString()}`);
}

function isSlugConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createAchievement(formData: FormData) {
  await requireAdminUser();

  const badgeImageFile = getAchievementBadgeUpload(formData.get("badgeImage"));
  const values = requireAchievementValues(formData);
  let createdAchievementId = "";
  let createdBadgeImagePath: string | null = null;

  if (badgeImageFile) {
    try {
      createdBadgeImagePath = await saveAchievementBadgeUpload(badgeImageFile);
    } catch (error) {
      if (error instanceof Error) {
        redirectToAdminAchievements("imageInvalid");
      }

      throw error;
    }
  }

  try {
    const achievement = await prisma.achievement.create({
      data: {
        ...values,
        badgeImagePath: createdBadgeImagePath,
      },
    });
    createdAchievementId = achievement.id;
  } catch (error) {
    await removeAchievementBadgeUpload(createdBadgeImagePath);

    if (isSlugConflict(error)) {
      redirectToAdminAchievements("conflict");
    }

    throw error;
  }

  revalidateAchievementPages();
  redirectToAdminAchievements("created", createdAchievementId);
}

export async function updateAchievement(formData: FormData) {
  await requireAdminUser();

  const achievementId = normalizeText(formData.get("achievementId"));
  const values = requireAchievementValues(formData);
  const selectedAchievementId = getSelectedAchievementId(formData) || achievementId;
  const badgeImageFile = getAchievementBadgeUpload(formData.get("badgeImage"));

  if (!achievementId) {
    redirectToAdminAchievements("invalid");
  }

  const existingAchievement = await prisma.achievement.findUnique({
    where: {
      id: achievementId,
    },
    select: {
      badgeImagePath: true,
      id: true,
    },
  });

  if (!existingAchievement) {
    redirectToAdminAchievements("invalid", selectedAchievementId);
  }

  let nextBadgeImagePath = existingAchievement.badgeImagePath;

  if (badgeImageFile) {
    try {
      nextBadgeImagePath = await saveAchievementBadgeUpload(badgeImageFile);
    } catch (error) {
      if (error instanceof Error) {
        redirectToAdminAchievements("imageInvalid", selectedAchievementId);
      }

      throw error;
    }
  }

  try {
    await prisma.achievement.update({
      where: {
        id: achievementId,
      },
      data: {
        ...values,
        badgeImagePath: nextBadgeImagePath,
      },
    });
  } catch (error) {
    if (
      badgeImageFile &&
      nextBadgeImagePath &&
      nextBadgeImagePath !== existingAchievement.badgeImagePath
    ) {
      await removeAchievementBadgeUpload(nextBadgeImagePath);
    }

    if (isSlugConflict(error)) {
      redirectToAdminAchievements("conflict", selectedAchievementId);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectToAdminAchievements("invalid", selectedAchievementId);
    }

    throw error;
  }

  if (
    badgeImageFile &&
    existingAchievement.badgeImagePath &&
    existingAchievement.badgeImagePath !== nextBadgeImagePath
  ) {
    await removeAchievementBadgeUpload(existingAchievement.badgeImagePath);
  }

  revalidateAchievementPages();
  redirectToAdminAchievements("updated", selectedAchievementId);
}

export async function deleteAchievement(formData: FormData) {
  await requireAdminUser();

  const achievementId = normalizeText(formData.get("achievementId"));
  if (!achievementId) {
    redirectToAdminAchievements("invalid");
  }

  try {
    const deletedAchievement = await prisma.achievement.delete({
      where: {
        id: achievementId,
      },
    });
    await removeAchievementBadgeUpload(deletedAchievement.badgeImagePath);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      redirectToAdminAchievements("invalid");
    }

    throw error;
  }

  revalidateAchievementPages();
  redirectToAdminAchievements("deleted");
}
