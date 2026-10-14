"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cardDetailHref(definitionId: string, status: string) {
  const params = new URLSearchParams({ card: status });
  return `/admin/magic-item-cards/${definitionId}?${params.toString()}`;
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
