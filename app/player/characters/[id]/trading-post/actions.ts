"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createNotification, createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatTradingPostRarity } from "@/lib/trading-post";

const listingSchema = z.object({
  characterId: z.string().trim().min(1),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "LEGENDARY", "UNIQUE"]),
  item: z.string().trim().min(1).max(80),
  itemName: z.string().trim().max(160).default(""),
  minorProperty: z.string().trim().max(80).default(""),
  flavorNotes: z.string().trim().max(160).default(""),
  adventureCode: z.string().trim().max(40).default(""),
  downtimeDaysSpent: z.coerce.number().int().min(0).max(999),
  lookingFor: z.string().trim().max(500).default(""),
});

const proposalSchema = z.object({
  characterId: z.string().trim().min(1),
  listingId: z.string().trim().min(1),
  item: z.string().trim().min(1).max(80),
  itemName: z.string().trim().max(160).default(""),
  minorProperty: z.string().trim().max(80).default(""),
  flavorNotes: z.string().trim().max(160).default(""),
  adventureCode: z.string().trim().max(40).default(""),
  downtimeDaysSpent: z.coerce.number().int().min(0).max(999),
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

function buildTradingPostHref(characterId: string) {
  return `/player/characters/${characterId}/trading-post`;
}

function revalidateTradingPostPaths(characterIds: string[]) {
  const uniqueCharacterIds = Array.from(new Set(characterIds.filter(Boolean)));

  revalidatePath("/player");

  for (const characterId of uniqueCharacterIds) {
    revalidatePath(`/player/characters/${characterId}`);
    revalidatePath(`/player/characters/${characterId}/trading-post`);
  }
}

export async function createTradingPostListing(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);
  const parsed = listingSchema.safeParse({
    characterId,
    rarity: formData.get("rarity"),
    item: formData.get("item"),
    itemName: formData.get("itemName"),
    minorProperty: formData.get("minorProperty"),
    flavorNotes: formData.get("flavorNotes"),
    adventureCode: formData.get("adventureCode"),
    downtimeDaysSpent: formData.get("downtimeDaysSpent"),
    lookingFor: formData.get("lookingFor"),
  });

  if (!parsed.success) {
    redirect(`${buildTradingPostHref(character.id)}?listing=invalid`);
  }

  await prisma.tradingPostListing.create({
    data: {
      userId: user.id,
      characterId: character.id,
      rarity: parsed.data.rarity,
      item: parsed.data.item,
      itemName: parsed.data.itemName,
      minorProperty: parsed.data.minorProperty,
      flavorNotes: parsed.data.flavorNotes,
      adventureCode: parsed.data.adventureCode,
      downtimeDaysSpent: parsed.data.downtimeDaysSpent,
      lookingFor: parsed.data.lookingFor,
    },
  });

  revalidateTradingPostPaths([character.id]);
  redirect(`${buildTradingPostHref(character.id)}?listing=created`);
}

export async function withdrawTradingPostListing(characterId: string, listingId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const listing = await prisma.tradingPostListing.findFirst({
    where: {
      id: listingId,
      characterId: character.id,
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      proposals: {
        where: {
          status: "PENDING",
        },
        include: {
          proposerCharacter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!listing) {
    redirect(`${buildTradingPostHref(character.id)}?listing=missing`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tradingPostListing.update({
      where: {
        id: listing.id,
      },
      data: {
        status: "WITHDRAWN",
      },
    });

    await tx.tradingPostProposal.updateMany({
      where: {
        listingId: listing.id,
        status: "PENDING",
      },
      data: {
        status: "WITHDRAWN",
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
    });

    await createNotifications(
      tx,
      listing.proposals.map((proposal) => ({
        userId: proposal.proposerUserId,
        createdByUserId: user.id,
        type: "ADMIN" as const,
        title: `${character.name} removed an item from the Trading Post`,
        body: `${character.name} removed a ${formatTradingPostRarity(listing.rarity)} listing before the trade was completed.`,
        details: [
          { label: "Listing owner", value: character.name },
          { label: "Your character", value: proposal.proposerCharacter.name },
          { label: "Item", value: listing.itemName || listing.item },
        ],
        actionLabel: "Open Trading Post",
        actionHref: buildTradingPostHref(proposal.proposerCharacter.id),
      })),
    );
  });

  revalidateTradingPostPaths([
    character.id,
    ...listing.proposals.map((proposal) => proposal.proposerCharacter.id),
  ]);
  redirect(`${buildTradingPostHref(character.id)}?listing=withdrawn`);
}

export async function createTradingPostProposal(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);
  const parsed = proposalSchema.safeParse({
    characterId,
    listingId: formData.get("listingId"),
    item: formData.get("item"),
    itemName: formData.get("itemName"),
    minorProperty: formData.get("minorProperty"),
    flavorNotes: formData.get("flavorNotes"),
    adventureCode: formData.get("adventureCode"),
    downtimeDaysSpent: formData.get("downtimeDaysSpent"),
  });

  if (!parsed.success) {
    redirect(`${buildTradingPostHref(character.id)}?proposal=invalid`);
  }

  const listing = await prisma.tradingPostListing.findFirst({
    where: {
      id: parsed.data.listingId,
      status: "ACTIVE",
    },
    include: {
      character: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!listing || listing.userId === user.id || listing.characterId === character.id) {
    redirect(`${buildTradingPostHref(character.id)}?proposal=missing`);
  }

  const existingPendingProposal = await prisma.tradingPostProposal.findFirst({
    where: {
      listingId: listing.id,
      proposerCharacterId: character.id,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  });

  if (existingPendingProposal) {
    redirect(`${buildTradingPostHref(character.id)}?proposal=duplicate`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tradingPostProposal.create({
      data: {
        listingId: listing.id,
        proposerUserId: user.id,
        proposerCharacterId: character.id,
        item: parsed.data.item,
        itemName: parsed.data.itemName,
        minorProperty: parsed.data.minorProperty,
        flavorNotes: parsed.data.flavorNotes,
        adventureCode: parsed.data.adventureCode,
        downtimeDaysSpent: parsed.data.downtimeDaysSpent,
      },
    });

    await createNotification(tx, {
      userId: listing.user.id,
      createdByUserId: user.id,
      type: "ADMIN",
      title: `New Trading Post proposal for ${listing.character.name}`,
      body: `${character.name} proposed a ${formatTradingPostRarity(listing.rarity)} item trade on your Trading Post listing.`,
      details: [
        { label: "Your listing", value: listing.itemName || listing.item },
        { label: "Offered by", value: character.name },
        { label: "Offered item", value: parsed.data.itemName || parsed.data.item },
      ],
      actionLabel: "Review proposal",
      actionHref: buildTradingPostHref(listing.character.id),
    });
  });

  revalidateTradingPostPaths([character.id, listing.character.id]);
  redirect(`${buildTradingPostHref(character.id)}?proposal=sent`);
}

export async function acceptTradingPostProposal(characterId: string, proposalId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const proposal = await prisma.tradingPostProposal.findFirst({
    where: {
      id: proposalId,
      status: "PENDING",
      listing: {
        characterId: character.id,
        userId: user.id,
        status: "ACTIVE",
      },
    },
    include: {
      listing: {
        include: {
          character: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      proposerCharacter: {
        select: {
          id: true,
          name: true,
        },
      },
      proposerUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!proposal) {
    redirect(`${buildTradingPostHref(character.id)}?proposal=missing`);
  }

  const siblingPendingProposals = await prisma.tradingPostProposal.findMany({
    where: {
      listingId: proposal.listingId,
      status: "PENDING",
      id: {
        not: proposal.id,
      },
    },
    include: {
      proposerCharacter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.characterTrade.create({
      data: {
        proposerUserId: proposal.listing.user.id,
        proposerCharacterId: proposal.listing.character.id,
        recipientUserId: proposal.proposerUser.id,
        recipientCharacterId: proposal.proposerCharacter.id,
        proposerItem: proposal.listing.item,
        proposerItemName: proposal.listing.itemName,
        proposerMinorProperty: proposal.listing.minorProperty,
        proposerFlavorNotes: proposal.listing.flavorNotes,
        proposerAdventureCode: proposal.listing.adventureCode,
        proposerDowntimeDaysSpent: proposal.listing.downtimeDaysSpent,
        recipientItem: proposal.item,
        recipientItemName: proposal.itemName,
        recipientMinorProperty: proposal.minorProperty,
        recipientFlavorNotes: proposal.flavorNotes,
        recipientAdventureCode: proposal.adventureCode,
        recipientDowntimeDaysSpent: proposal.downtimeDaysSpent,
        status: "CONFIRMED",
        confirmedByUserId: user.id,
        confirmedAt: new Date(),
      },
    });

    await tx.tradingPostProposal.update({
      where: {
        id: proposal.id,
      },
      data: {
        status: "ACCEPTED",
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
    });

    await tx.tradingPostListing.update({
      where: {
        id: proposal.listingId,
      },
      data: {
        status: "TRADED",
      },
    });

    if (siblingPendingProposals.length) {
      await tx.tradingPostProposal.updateMany({
        where: {
          listingId: proposal.listingId,
          status: "PENDING",
          id: {
            not: proposal.id,
          },
        },
        data: {
          status: "DECLINED",
          reviewedAt: new Date(),
          reviewedByUserId: user.id,
        },
      });
    }

    await createNotification(tx, {
      userId: proposal.proposerUser.id,
      createdByUserId: user.id,
      type: "ADMIN",
      title: `${proposal.listing.character.name} accepted your Trading Post offer`,
      body: `${proposal.listing.character.name} accepted your trade proposal, and the trade was added to both character trade logs.`,
      details: [
        { label: "Your item", value: proposal.itemName || proposal.item },
        {
          label: "Received item",
          value: proposal.listing.itemName || proposal.listing.item,
        },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${proposal.proposerCharacter.id}`,
    });

    await createNotifications(
      tx,
      siblingPendingProposals.map((sibling) => ({
        userId: sibling.proposerUserId,
        createdByUserId: user.id,
        type: "ADMIN" as const,
        title: `${proposal.listing.character.name} accepted another Trading Post offer`,
        body: `${proposal.listing.character.name} completed a different trade for this listing, so your proposal was closed.`,
        details: [
          {
            label: "Listing",
            value: proposal.listing.itemName || proposal.listing.item,
          },
          { label: "Your character", value: sibling.proposerCharacter.name },
        ],
        actionLabel: "Open Trading Post",
        actionHref: buildTradingPostHref(sibling.proposerCharacter.id),
      })),
    );
  });

  revalidateTradingPostPaths([
    character.id,
    proposal.proposerCharacter.id,
    ...siblingPendingProposals.map((sibling) => sibling.proposerCharacter.id),
  ]);
  redirect(`${buildTradingPostHref(character.id)}?proposal=accepted`);
}

export async function declineTradingPostProposal(characterId: string, proposalId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const proposal = await prisma.tradingPostProposal.findFirst({
    where: {
      id: proposalId,
      status: "PENDING",
      listing: {
        characterId: character.id,
        userId: user.id,
        status: "ACTIVE",
      },
    },
    include: {
      listing: {
        select: {
          item: true,
          itemName: true,
          character: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      proposerCharacter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!proposal) {
    redirect(`${buildTradingPostHref(character.id)}?proposal=missing`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tradingPostProposal.update({
      where: {
        id: proposal.id,
      },
      data: {
        status: "DECLINED",
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
    });

    await createNotification(tx, {
      userId: proposal.proposerUserId,
      createdByUserId: user.id,
      type: "ADMIN",
      title: `${proposal.listing.character.name} declined your Trading Post offer`,
      body: `${proposal.listing.character.name} declined the trade proposal for this listing.`,
      details: [
        {
          label: "Listing",
          value: proposal.listing.itemName || proposal.listing.item,
        },
        { label: "Your character", value: proposal.proposerCharacter.name },
      ],
      actionLabel: "Open Trading Post",
      actionHref: buildTradingPostHref(proposal.proposerCharacter.id),
    });
  });

  revalidateTradingPostPaths([character.id, proposal.proposerCharacter.id]);
  redirect(`${buildTradingPostHref(character.id)}?proposal=declined`);
}
