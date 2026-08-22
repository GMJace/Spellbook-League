"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const TRADE_DOWNTIME_DAYS = 5;

const tradeSideSchema = z.object({
  item: z.string().trim().min(1).max(80),
  itemName: z.string().trim().max(160).default(""),
  minorProperty: z.string().trim().max(80).default(""),
  flavorNotes: z.string().trim().max(160).default(""),
  specialNotes: z.string().trim().max(600).default(""),
  adventureCode: z.string().trim().max(40).default(""),
});

const linkedCharacterIdSchema = z.preprocess((value) => {
  const parsedValue = String(value ?? "").trim();
  return parsedValue ? parsedValue : undefined;
}, z.string().min(1).optional());

const characterTradeSchema = z.object({
  characterId: z.string().trim().min(1),
  proposerPlayerName: z.string().trim().min(1).max(120),
  proposerCharacterName: z.string().trim().min(1).max(120),
  recipientCharacterId: linkedCharacterIdSchema,
  recipientPlayerName: z.string().trim().min(1).max(120),
  recipientCharacterName: z.string().trim().min(1).max(120),
  proposerItem: tradeSideSchema.shape.item,
  proposerItemName: tradeSideSchema.shape.itemName,
  proposerMinorProperty: tradeSideSchema.shape.minorProperty,
  proposerFlavorNotes: tradeSideSchema.shape.flavorNotes,
  proposerSpecialNotes: tradeSideSchema.shape.specialNotes,
  proposerAdventureCode: tradeSideSchema.shape.adventureCode,
  recipientItem: tradeSideSchema.shape.item,
  recipientItemName: tradeSideSchema.shape.itemName,
  recipientMinorProperty: tradeSideSchema.shape.minorProperty,
  recipientFlavorNotes: tradeSideSchema.shape.flavorNotes,
  recipientSpecialNotes: tradeSideSchema.shape.specialNotes,
  recipientAdventureCode: tradeSideSchema.shape.adventureCode,
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

async function requireAccessibleTrade(characterId: string, tradeId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const trade = await prisma.characterTrade.findFirst({
    where: {
      id: tradeId,
      OR: [
        {
          proposerCharacterId: character.id,
        },
        {
          recipientCharacterId: character.id,
        },
      ],
      AND: [
        {
          OR: [
            { proposerUserId: user.id },
            { recipientUserId: user.id },
          ],
        },
      ],
    },
    select: {
      id: true,
      proposerUserId: true,
      proposerCharacterId: true,
      recipientUserId: true,
      recipientCharacterId: true,
      confirmedByUserId: true,
      status: true,
    },
  });

  if (!trade) {
    redirect(`/player/characters/${characterId}?trade=missing`);
  }

  return { user, character, trade };
}

function buildTradeActionHref(characterId: string) {
  return `/player/characters/${characterId}`;
}

function revalidateTradePages(proposerCharacterId: string, recipientCharacterId?: string | null) {
  revalidatePath("/player");
  revalidatePath(`/player/characters/${proposerCharacterId}`);
  revalidatePath(`/player/characters/${proposerCharacterId}/trades/new`);
  revalidatePath(`/player/characters/${proposerCharacterId}/trades`);

  if (recipientCharacterId) {
    revalidatePath(`/player/characters/${recipientCharacterId}`);
    revalidatePath(`/player/characters/${recipientCharacterId}/trades`);
  }
}

function buildTradeQueryHref(characterId: string, trade: string) {
  return `/player/characters/${characterId}?trade=${trade}`;
}

export async function createCharacterTrade(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);

  const parsed = characterTradeSchema.safeParse({
    characterId,
    proposerPlayerName: formData.get("proposerPlayerName"),
    proposerCharacterName: formData.get("proposerCharacterName"),
    recipientCharacterId: formData.get("recipientCharacterId"),
    recipientPlayerName: formData.get("recipientPlayerName"),
    recipientCharacterName: formData.get("recipientCharacterName"),
    proposerItem: formData.get("proposerItem"),
    proposerItemName: formData.get("proposerItemName"),
    proposerMinorProperty: formData.get("proposerMinorProperty"),
    proposerFlavorNotes: formData.get("proposerFlavorNotes"),
    proposerSpecialNotes: formData.get("proposerSpecialNotes"),
    proposerAdventureCode: formData.get("proposerAdventureCode"),
    recipientItem: formData.get("recipientItem"),
    recipientItemName: formData.get("recipientItemName"),
    recipientMinorProperty: formData.get("recipientMinorProperty"),
    recipientFlavorNotes: formData.get("recipientFlavorNotes"),
    recipientSpecialNotes: formData.get("recipientSpecialNotes"),
    recipientAdventureCode: formData.get("recipientAdventureCode"),
  });

  if (!parsed.success) {
    redirect(`/player/characters/${characterId}/trades/new?trade=invalid`);
  }

  if (parsed.data.recipientCharacterId === character.id) {
    redirect(`/player/characters/${characterId}/trades/new?trade=invalid`);
  }

  const recipientCharacter = parsed.data.recipientCharacterId
    ? await prisma.character.findFirst({
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
      })
    : null;

  if (parsed.data.recipientCharacterId && !recipientCharacter) {
    redirect(`/player/characters/${characterId}/trades/new?trade=missing`);
  }

  await prisma.$transaction(async (tx) => {
    const isLinkedRecipient = Boolean(recipientCharacter);
    const confirmedAt = isLinkedRecipient ? null : new Date();

    await tx.characterTrade.create({
      data: {
        proposerUserId: user.id,
        proposerCharacterId: character.id,
        proposerPlayerName: parsed.data.proposerPlayerName,
        proposerCharacterName: parsed.data.proposerCharacterName,
        recipientUserId: recipientCharacter?.userId,
        recipientCharacterId: recipientCharacter?.id,
        recipientPlayerName: parsed.data.recipientPlayerName,
        recipientCharacterName: parsed.data.recipientCharacterName,
        proposerItem: parsed.data.proposerItem,
        proposerItemName: parsed.data.proposerItemName,
        proposerMinorProperty: parsed.data.proposerMinorProperty,
        proposerFlavorNotes: parsed.data.proposerFlavorNotes,
        proposerSpecialNotes: parsed.data.proposerSpecialNotes,
        proposerAdventureCode: parsed.data.proposerAdventureCode,
        proposerDowntimeDaysSpent: TRADE_DOWNTIME_DAYS,
        recipientItem: parsed.data.recipientItem,
        recipientItemName: parsed.data.recipientItemName,
        recipientMinorProperty: parsed.data.recipientMinorProperty,
        recipientFlavorNotes: parsed.data.recipientFlavorNotes,
        recipientSpecialNotes: parsed.data.recipientSpecialNotes,
        recipientAdventureCode: parsed.data.recipientAdventureCode,
        recipientDowntimeDaysSpent: TRADE_DOWNTIME_DAYS,
        status: isLinkedRecipient ? "PENDING" : "CONFIRMED",
        confirmedAt,
        confirmedByUserId: isLinkedRecipient ? null : user.id,
      },
    });

    if (recipientCharacter) {
      await createNotification(tx, {
        userId: recipientCharacter.userId,
        createdByUserId: user.id,
        type: "ADMIN",
        title: `Trade proposed for ${parsed.data.recipientCharacterName}`,
        body: `${parsed.data.proposerPlayerName} proposed a character trade between ${parsed.data.proposerCharacterName} and ${parsed.data.recipientCharacterName}.`,
        details: [
          { label: "Player 1", value: parsed.data.proposerCharacterName },
          { label: "Item offered", value: parsed.data.proposerItemName || parsed.data.proposerItem },
          { label: "Player 2", value: parsed.data.recipientCharacterName },
          { label: "Item requested", value: parsed.data.recipientItemName || parsed.data.recipientItem },
        ],
        actionLabel: "Review trade",
        actionHref: buildTradeActionHref(recipientCharacter.id),
      });
    }
  });

  revalidateTradePages(character.id, recipientCharacter?.id);

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
      proposerCharacterName: true,
      recipientCharacterName: true,
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
    const recipientCharacterName = trade.recipientCharacter?.name || trade.recipientCharacterName;
    const proposerCharacterName = trade.proposerCharacter?.name || trade.proposerCharacterName;

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
      title: `Trade confirmed by ${recipientCharacterName}`,
      body: `${recipientCharacterName} confirmed the trade with ${proposerCharacterName}.`,
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

export async function updateCharacterTrade(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");
  const tradeId = String(formData.get("tradeId") ?? "");

  if (!characterId || !tradeId) {
    redirect("/player");
  }

  const { character, trade: existingTrade } = await requireAccessibleTrade(characterId, tradeId);

  const parsed = characterTradeSchema.safeParse({
    characterId,
    proposerPlayerName: formData.get("proposerPlayerName"),
    proposerCharacterName: formData.get("proposerCharacterName"),
    recipientCharacterId: formData.get("recipientCharacterId"),
    recipientPlayerName: formData.get("recipientPlayerName"),
    recipientCharacterName: formData.get("recipientCharacterName"),
    proposerItem: formData.get("proposerItem"),
    proposerItemName: formData.get("proposerItemName"),
    proposerMinorProperty: formData.get("proposerMinorProperty"),
    proposerFlavorNotes: formData.get("proposerFlavorNotes"),
    proposerSpecialNotes: formData.get("proposerSpecialNotes"),
    proposerAdventureCode: formData.get("proposerAdventureCode"),
    recipientItem: formData.get("recipientItem"),
    recipientItemName: formData.get("recipientItemName"),
    recipientMinorProperty: formData.get("recipientMinorProperty"),
    recipientFlavorNotes: formData.get("recipientFlavorNotes"),
    recipientSpecialNotes: formData.get("recipientSpecialNotes"),
    recipientAdventureCode: formData.get("recipientAdventureCode"),
  });

  if (!parsed.success) {
    redirect(`/player/characters/${characterId}/trades/${tradeId}/edit?trade=invalid`);
  }

  if (parsed.data.recipientCharacterId === existingTrade.proposerCharacterId) {
    redirect(`/player/characters/${characterId}/trades/${tradeId}/edit?trade=invalid`);
  }

  const recipientCharacter = parsed.data.recipientCharacterId
    ? await prisma.character.findFirst({
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
          userId: true,
        },
      })
    : null;

  if (parsed.data.recipientCharacterId && !recipientCharacter) {
    redirect(`/player/characters/${characterId}/trades/${tradeId}/edit?trade=missing`);
  }

  await prisma.characterTrade.update({
    where: {
      id: tradeId,
    },
    data: {
      proposerPlayerName: parsed.data.proposerPlayerName,
      proposerCharacterName: parsed.data.proposerCharacterName,
      recipientUserId: recipientCharacter?.userId ?? null,
      recipientCharacterId: recipientCharacter?.id ?? null,
      recipientPlayerName: parsed.data.recipientPlayerName,
      recipientCharacterName: parsed.data.recipientCharacterName,
      proposerItem: parsed.data.proposerItem,
      proposerItemName: parsed.data.proposerItemName,
      proposerMinorProperty: parsed.data.proposerMinorProperty,
      proposerFlavorNotes: parsed.data.proposerFlavorNotes,
      proposerSpecialNotes: parsed.data.proposerSpecialNotes,
      proposerAdventureCode: parsed.data.proposerAdventureCode,
      proposerDowntimeDaysSpent: TRADE_DOWNTIME_DAYS,
      recipientItem: parsed.data.recipientItem,
      recipientItemName: parsed.data.recipientItemName,
      recipientMinorProperty: parsed.data.recipientMinorProperty,
      recipientFlavorNotes: parsed.data.recipientFlavorNotes,
      recipientSpecialNotes: parsed.data.recipientSpecialNotes,
      recipientAdventureCode: parsed.data.recipientAdventureCode,
      recipientDowntimeDaysSpent: TRADE_DOWNTIME_DAYS,
      status: recipientCharacter ? "PENDING" : "CONFIRMED",
      confirmedAt: recipientCharacter ? null : new Date(),
      confirmedByUserId: recipientCharacter ? null : existingTrade.confirmedByUserId ?? existingTrade.proposerUserId,
    },
  });

  revalidateTradePages(existingTrade.proposerCharacterId, recipientCharacter?.id ?? existingTrade.recipientCharacterId);

  redirect(buildTradeQueryHref(character.id, "updated"));
}

export async function deleteCharacterTrade(characterId: string, tradeId: string) {
  const { character, trade } = await requireAccessibleTrade(characterId, tradeId);

  await prisma.characterTrade.delete({
    where: {
      id: trade.id,
    },
  });

  revalidateTradePages(trade.proposerCharacterId, trade.recipientCharacterId);

  redirect(buildTradeQueryHref(character.id, "deleted"));
}
