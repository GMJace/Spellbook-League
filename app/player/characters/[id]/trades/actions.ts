"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const tradeSideSchema = z.object({
  item: z.string().trim().min(1).max(80),
  itemName: z.string().trim().max(160).default(""),
  minorProperty: z.string().trim().max(80).default(""),
  flavorNotes: z.string().trim().max(160).default(""),
  adventureCode: z.string().trim().max(40).default(""),
  downtimeDaysSpent: z.coerce.number().int().min(0).max(999),
});

const characterTradeSchema = z.object({
  characterId: z.string().trim().min(1),
  recipientCharacterId: z.string().trim().min(1),
  proposerItem: tradeSideSchema.shape.item,
  proposerItemName: tradeSideSchema.shape.itemName,
  proposerMinorProperty: tradeSideSchema.shape.minorProperty,
  proposerFlavorNotes: tradeSideSchema.shape.flavorNotes,
  proposerAdventureCode: tradeSideSchema.shape.adventureCode,
  proposerDowntimeDaysSpent: tradeSideSchema.shape.downtimeDaysSpent,
  recipientItem: tradeSideSchema.shape.item,
  recipientItemName: tradeSideSchema.shape.itemName,
  recipientMinorProperty: tradeSideSchema.shape.minorProperty,
  recipientFlavorNotes: tradeSideSchema.shape.flavorNotes,
  recipientAdventureCode: tradeSideSchema.shape.adventureCode,
  recipientDowntimeDaysSpent: tradeSideSchema.shape.downtimeDaysSpent,
});

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

function buildTradeActionHref(characterId: string) {
  return `/player/characters/${characterId}`;
}

function revalidateTradePages(proposerCharacterId: string, recipientCharacterId: string) {
  revalidatePath("/player");
  revalidatePath(`/player/characters/${proposerCharacterId}`);
  revalidatePath(`/player/characters/${recipientCharacterId}`);
  revalidatePath(`/player/characters/${proposerCharacterId}/trades/new`);
}

export async function createCharacterTrade(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);

  const parsed = characterTradeSchema.safeParse({
    characterId,
    recipientCharacterId: formData.get("recipientCharacterId"),
    proposerItem: formData.get("proposerItem"),
    proposerItemName: formData.get("proposerItemName"),
    proposerMinorProperty: formData.get("proposerMinorProperty"),
    proposerFlavorNotes: formData.get("proposerFlavorNotes"),
    proposerAdventureCode: formData.get("proposerAdventureCode"),
    proposerDowntimeDaysSpent: formData.get("proposerDowntimeDaysSpent"),
    recipientItem: formData.get("recipientItem"),
    recipientItemName: formData.get("recipientItemName"),
    recipientMinorProperty: formData.get("recipientMinorProperty"),
    recipientFlavorNotes: formData.get("recipientFlavorNotes"),
    recipientAdventureCode: formData.get("recipientAdventureCode"),
    recipientDowntimeDaysSpent: formData.get("recipientDowntimeDaysSpent"),
  });

  if (!parsed.success) {
    redirect(`/player/characters/${characterId}/trades/new?trade=invalid`);
  }

  if (parsed.data.recipientCharacterId === character.id) {
    redirect(`/player/characters/${characterId}/trades/new?trade=invalid`);
  }

  const recipientCharacter = await prisma.character.findFirst({
    where: {
      id: parsed.data.recipientCharacterId,
      user: {
        roles: {
          some: {
            role: "PLAYER",
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      userId: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!recipientCharacter || recipientCharacter.userId === user.id) {
    redirect(`/player/characters/${characterId}/trades/new?trade=missing`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.characterTrade.create({
      data: {
        proposerUserId: user.id,
        proposerCharacterId: character.id,
        recipientUserId: recipientCharacter.userId,
        recipientCharacterId: recipientCharacter.id,
        proposerItem: parsed.data.proposerItem,
        proposerItemName: parsed.data.proposerItemName,
        proposerMinorProperty: parsed.data.proposerMinorProperty,
        proposerFlavorNotes: parsed.data.proposerFlavorNotes,
        proposerAdventureCode: parsed.data.proposerAdventureCode,
        proposerDowntimeDaysSpent: parsed.data.proposerDowntimeDaysSpent,
        recipientItem: parsed.data.recipientItem,
        recipientItemName: parsed.data.recipientItemName,
        recipientMinorProperty: parsed.data.recipientMinorProperty,
        recipientFlavorNotes: parsed.data.recipientFlavorNotes,
        recipientAdventureCode: parsed.data.recipientAdventureCode,
        recipientDowntimeDaysSpent: parsed.data.recipientDowntimeDaysSpent,
      },
    });

    await createNotification(tx, {
      userId: recipientCharacter.userId,
      createdByUserId: user.id,
      type: "ADMIN",
      title: `Trade proposed for ${recipientCharacter.name}`,
      body: `${user.name} proposed a character trade between ${character.name} and ${recipientCharacter.name}.`,
      details: [
        { label: "Player 1", value: character.name },
        { label: "Item offered", value: parsed.data.proposerItemName || parsed.data.proposerItem },
        { label: "Player 2", value: recipientCharacter.name },
        { label: "Item requested", value: parsed.data.recipientItemName || parsed.data.recipientItem },
      ],
      actionLabel: "Review trade",
      actionHref: buildTradeActionHref(recipientCharacter.id),
    });
  });

  revalidateTradePages(character.id, recipientCharacter.id);

  redirect(`/player/characters/${character.id}?trade=created`);
}

export async function confirmCharacterTrade(characterId: string, tradeId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const trade = await prisma.characterTrade.findFirst({
    where: {
      id: tradeId,
      recipientCharacterId: character.id,
      recipientUserId: user.id,
      status: "PENDING",
    },
    select: {
      id: true,
      proposerUserId: true,
      proposerCharacterId: true,
      proposerCharacter: {
        select: {
          id: true,
          name: true,
        },
      },
      recipientCharacter: {
        select: {
          id: true,
          name: true,
        },
      },
      proposerItem: true,
      proposerItemName: true,
      recipientItem: true,
      recipientItemName: true,
    },
  });

  if (!trade) {
    redirect(`/player/characters/${characterId}?trade=missing`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.characterTrade.update({
      where: {
        id: trade.id,
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedByUserId: user.id,
      },
    });

    await createNotification(tx, {
      userId: trade.proposerUserId,
      createdByUserId: user.id,
      type: "ADMIN",
      title: `Trade confirmed by ${trade.recipientCharacter.name}`,
      body: `${trade.recipientCharacter.name} confirmed the trade with ${trade.proposerCharacter.name}.`,
      details: [
        {
          label: "Item sent",
          value: trade.proposerItemName || trade.proposerItem,
        },
        {
          label: "Item received",
          value: trade.recipientItemName || trade.recipientItem,
        },
      ],
      actionLabel: "Open character",
      actionHref: buildTradeActionHref(trade.proposerCharacterId),
    });
  });

  revalidateTradePages(trade.proposerCharacterId, character.id);

  redirect(`/player/characters/${character.id}?trade=confirmed`);
}
