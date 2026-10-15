"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/admin";
import {
  getMagicItemCardImageUpload,
  listMagicItemCardImages,
  removeMagicItemCardImageUpload,
  saveMagicItemCardImageUpload,
} from "@/lib/magic-item-card-image-upload";
import { prisma } from "@/lib/prisma";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cardDetailHref(definitionId: string, status: string) {
  const params = new URLSearchParams({ card: status });
  return `/admin/magic-item-cards/${definitionId}?${params.toString()}`;
}

function catalogHref(status: string) {
  const params = new URLSearchParams({ catalog: status });
  return `/admin/magic-item-cards?${params.toString()}`;
}

function parseLimitedEditionLimit(value: string) {
  if (!value) {
    return null;
  }

  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0 ? limit : undefined;
}

export async function createMagicItemCardDefinition(formData: FormData) {
  await requireAdminUser();

  const itemName = normalizeText(formData.get("itemName"));
  const countsAs = normalizeText(formData.get("countsAs"));
  const rarity = normalizeText(formData.get("rarity"));
  const minorProperty = normalizeText(formData.get("minorProperty"));
  const flavorNotes = normalizeText(formData.get("flavorNotes"));
  const selectedFrontImagePath = normalizeText(formData.get("frontImagePath"));
  const selectedBackImagePath = normalizeText(formData.get("backImagePath"));
  const frontImage = getMagicItemCardImageUpload(formData.get("frontImage"));
  const backImage = getMagicItemCardImageUpload(formData.get("backImage"));
  const limitedEditionLimit = parseLimitedEditionLimit(
    normalizeText(formData.get("limitedEditionLimit")),
  );

  if (!itemName || limitedEditionLimit === undefined) {
    redirect(catalogHref("invalid"));
  }

  const availableImagePaths = new Set(
    (await listMagicItemCardImages()).map((image) => image.path),
  );

  if (
    (!frontImage && !availableImagePaths.has(selectedFrontImagePath)) ||
    (!backImage && !availableImagePaths.has(selectedBackImagePath))
  ) {
    redirect(catalogHref("images-required"));
  }

  const uploadedImagePaths: string[] = [];
  let createdDefinitionId = "";

  try {
    const frontImagePath = frontImage
      ? await saveMagicItemCardImageUpload(frontImage, itemName, "front")
      : selectedFrontImagePath;
    if (frontImage) uploadedImagePaths.push(frontImagePath);

    const backImagePath = backImage
      ? await saveMagicItemCardImageUpload(backImage, itemName, "back")
      : selectedBackImagePath;
    if (backImage) uploadedImagePaths.push(backImagePath);

    const definition = await prisma.magicItemCardDefinition.create({
      data: {
        backImagePath,
        countsAs,
        flavorNotes,
        frontImagePath,
        itemName,
        limitedEditionLimit,
        minorProperty,
        rarity,
      },
    });
    createdDefinitionId = definition.id;
  } catch (error) {
    await Promise.all(uploadedImagePaths.map(removeMagicItemCardImageUpload));

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(catalogHref("duplicate"));
    }

    if (
      error instanceof Error &&
      (error.message === "CARD_IMAGE_TYPE_INVALID" ||
        error.message === "CARD_IMAGE_TOO_LARGE")
    ) {
      redirect(catalogHref("image-invalid"));
    }

    throw error;
  }

  revalidatePath("/admin/magic-item-cards");
  redirect(cardDetailHref(createdDefinitionId, "created"));
}

export async function updateMagicItemCardDefinition(formData: FormData) {
  await requireAdminUser();

  const definitionId = normalizeText(formData.get("definitionId"));
  const itemName = normalizeText(formData.get("itemName"));
  const countsAs = normalizeText(formData.get("countsAs"));
  const rarity = normalizeText(formData.get("rarity"));
  const minorProperty = normalizeText(formData.get("minorProperty"));
  const flavorNotes = normalizeText(formData.get("flavorNotes"));
  const selectedFrontImagePath = normalizeText(formData.get("frontImagePath"));
  const selectedBackImagePath = normalizeText(formData.get("backImagePath"));
  const frontImage = getMagicItemCardImageUpload(formData.get("frontImage"));
  const backImage = getMagicItemCardImageUpload(formData.get("backImage"));
  const limitedEditionLimit = parseLimitedEditionLimit(
    normalizeText(formData.get("limitedEditionLimit")),
  );

  if (!definitionId || !itemName || limitedEditionLimit === undefined) {
    redirect(cardDetailHref(definitionId || "missing", "update-invalid"));
  }

  const [definition, availableImages, awards] = await Promise.all([
    prisma.magicItemCardDefinition.findUnique({ where: { id: definitionId } }),
    listMagicItemCardImages(),
    prisma.magicItemCard.findMany({
      where: { definitionId },
      select: { characterId: true },
      distinct: ["characterId"],
    }),
  ]);

  if (!definition) {
    redirect(cardDetailHref(definitionId, "update-invalid"));
  }

  if (limitedEditionLimit != null && limitedEditionLimit < definition.awardedCount) {
    redirect(cardDetailHref(definitionId, "limit-too-low"));
  }

  const availableImagePaths = new Set(availableImages.map((image) => image.path));
  const frontImagePathIsValid =
    selectedFrontImagePath === definition.frontImagePath ||
    availableImagePaths.has(selectedFrontImagePath);
  const backImagePathIsValid =
    selectedBackImagePath === definition.backImagePath ||
    availableImagePaths.has(selectedBackImagePath);

  if ((!frontImage && !frontImagePathIsValid) || (!backImage && !backImagePathIsValid)) {
    redirect(cardDetailHref(definitionId, "images-required"));
  }

  const uploadedImagePaths: string[] = [];

  try {
    const frontImagePath = frontImage
      ? await saveMagicItemCardImageUpload(frontImage, itemName, "front")
      : selectedFrontImagePath;
    if (frontImage) uploadedImagePaths.push(frontImagePath);

    const backImagePath = backImage
      ? await saveMagicItemCardImageUpload(backImage, itemName, "back")
      : selectedBackImagePath;
    if (backImage) uploadedImagePaths.push(backImagePath);

    const updatedCardValues = {
      backImagePath,
      countsAs,
      flavorNotes,
      frontImagePath,
      itemName,
      limitedEditionLimit,
      minorProperty,
      rarity,
    };

    await prisma.$transaction([
      prisma.magicItemCardDefinition.update({
        where: { id: definitionId },
        data: updatedCardValues,
      }),
      prisma.magicItemCard.updateMany({
        where: { definitionId },
        data: updatedCardValues,
      }),
    ]);
  } catch (error) {
    await Promise.all(uploadedImagePaths.map(removeMagicItemCardImageUpload));

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(cardDetailHref(definitionId, "duplicate-name"));
    }

    if (
      error instanceof Error &&
      (error.message === "CARD_IMAGE_TYPE_INVALID" ||
        error.message === "CARD_IMAGE_TOO_LARGE")
    ) {
      redirect(cardDetailHref(definitionId, "image-invalid"));
    }

    throw error;
  }

  revalidateCardPages(definitionId);
  for (const award of awards) {
    revalidatePath(`/player/characters/${award.characterId}`);
    revalidatePath(`/player/characters/${award.characterId}/edit`);
  }
  redirect(cardDetailHref(definitionId, "updated"));
}

function revalidateCardPages(definitionId: string, characterId?: string) {
  revalidatePath("/admin/magic-item-cards");
  revalidatePath(`/admin/magic-item-cards/${definitionId}`);

  if (characterId) {
    revalidatePath(`/player/characters/${characterId}`);
    revalidatePath(`/player/characters/${characterId}/edit`);
  }
}

export async function awardMagicItemCard(formData: FormData) {
  await requireAdminUser();

  const definitionId = normalizeText(formData.get("definitionId"));
  const characterId = normalizeText(formData.get("characterId"));
  const gameParticipantId = normalizeText(formData.get("gameParticipantId"));

  if (!definitionId || !characterId) {
    redirect(cardDetailHref(definitionId || "missing", "invalid"));
  }

  const [definition, character, participant] = await Promise.all([
    prisma.magicItemCardDefinition.findUnique({ where: { id: definitionId } }),
    prisma.character.findUnique({ where: { id: characterId }, select: { id: true } }),
    gameParticipantId
      ? prisma.gameParticipant.findFirst({
          where: {
            id: gameParticipantId,
            characterId,
            chestCode: { not: null },
            chestCodeRedeemedAt: { not: null },
            logStatus: "APPROVED",
            game: { status: "COMPLETED" },
          },
          include: {
            game: {
              select: {
                title: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!definition || !character || (gameParticipantId && !participant)) {
    redirect(cardDetailHref(definitionId, "invalid"));
  }

  if (participant) {
    const existingAward = await prisma.magicItemCard.findFirst({
      where: {
        definitionId,
        gameParticipantId: participant.id,
      },
      select: { id: true },
    });

    if (existingAward) {
      redirect(cardDetailHref(definitionId, "duplicate-code"));
    }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const currentDefinition = await transaction.magicItemCardDefinition.findUnique({
        where: { id: definition.id },
      });

      if (!currentDefinition) {
        throw new Error("CARD_DEFINITION_NOT_FOUND");
      }

      const nextEditionNumber = currentDefinition.awardedCount + 1;

      if (
        currentDefinition.limitedEditionLimit != null &&
        nextEditionNumber > currentDefinition.limitedEditionLimit
      ) {
        throw new Error("CARD_EDITION_LIMIT_REACHED");
      }

      await transaction.magicItemCardDefinition.update({
        where: { id: definition.id },
        data: {
          awardedCount: { increment: 1 },
        },
      });

      await transaction.magicItemCard.create({
        data: {
          definitionId: definition.id,
          characterId,
          gameParticipantId: participant?.id ?? null,
          frontImagePath: currentDefinition.frontImagePath,
          backImagePath: currentDefinition.backImagePath,
          itemName: currentDefinition.itemName,
          countsAs: currentDefinition.countsAs,
          minorProperty: currentDefinition.minorProperty,
          rarity: currentDefinition.rarity,
          flavorNotes: currentDefinition.flavorNotes,
          adventureTitle: participant?.game.title ?? "Admin award",
          limitedEditionNumber: nextEditionNumber,
          limitedEditionLimit: currentDefinition.limitedEditionLimit,
          isCarried: false,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CARD_EDITION_LIMIT_REACHED") {
      redirect(cardDetailHref(definitionId, "limit-reached"));
    }

    throw error;
  }

  revalidateCardPages(definitionId, characterId);
  redirect(cardDetailHref(definitionId, "awarded"));
}

export async function revokeMagicItemCard(formData: FormData) {
  await requireAdminUser();

  const definitionId = normalizeText(formData.get("definitionId"));
  const awardId = normalizeText(formData.get("awardId"));

  if (!definitionId || !awardId) {
    redirect(cardDetailHref(definitionId || "missing", "invalid"));
  }

  const award = await prisma.magicItemCard.findFirst({
    where: {
      id: awardId,
      definitionId,
    },
    select: {
      characterId: true,
      id: true,
    },
  });

  if (!award) {
    redirect(cardDetailHref(definitionId, "invalid"));
  }

  await prisma.magicItemCard.delete({ where: { id: award.id } });

  revalidateCardPages(definitionId, award.characterId);
  redirect(cardDetailHref(definitionId, "revoked"));
}
