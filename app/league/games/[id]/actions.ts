"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { getCharacterTier, getCharacterTotalLevel } from "@/lib/character";
import type { SerializedLeagueCheckoutData } from "@/lib/paypal-checkout-types";
import { prisma } from "@/lib/prisma";
import {
  sendLeagueRefundRequestConfirmationEmail,
  sendLeagueRefundRequestEmail,
} from "@/lib/transactional-email";
import { formatDateTime, formatTier, isPaidTicketPrice } from "@/lib/utils";

function redirectToSignupState(gameId: string, state: string) {
  redirect(`/league/games/${gameId}?signup=${encodeURIComponent(state)}`);
}

function redirectToLeaveState(gameId: string, state: string) {
  redirect(`/league/games/${gameId}?leave=${encodeURIComponent(state)}`);
}

function getLeagueSupportEmail() {
  return process.env.LEAGUE_SUPPORT_EMAIL?.trim() || "trevor@spellbookrpg.games";
}

function parseSerializedLeagueCheckoutItems(value: string) {
  try {
    const parsed = JSON.parse(value) as SerializedLeagueCheckoutData;
    const items = Array.isArray(parsed) ? parsed : parsed?.games;

    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter(
      (item): item is NonNullable<(typeof items)[number]> =>
        Boolean(item) && typeof item === "object",
    );
  } catch {
    return [];
  }
}

export async function signupForFreeLeagueGame(formData: FormData) {
  const user = await requireRole("PLAYER");
  const gameId = String(formData.get("gameId") ?? "").trim();
  const characterId = String(formData.get("characterId") ?? "").trim();

  if (!gameId) {
    redirect("/league");
  }

  if (!characterId) {
    redirectToSignupState(gameId, "choose-character");
  }

  const player = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      characters: {
        select: {
          id: true,
          name: true,
          class1Level: true,
          class2Level: true,
          class3Level: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!player) {
    redirect("/login?session=stale");
  }

  if (!player.characters.some((character) => character.id === characterId)) {
    redirectToSignupState(gameId, "invalid-character");
  }

  const result = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: {
        id: gameId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            characterId: true,
          },
        },
      },
    });

    if (!game) {
      return "missing";
    }

    if (game.status !== "SCHEDULED") {
      return "closed";
    }

    if (isPaidTicketPrice(game.ticketPrice)) {
      return "paid";
    }

    if (game.participants.some((participant) => participant.userId === user.id)) {
      return "already";
    }

    if (game.participants.some((participant) => participant.characterId === characterId)) {
      return "already";
    }

    const selectedCharacter =
      player.characters.find((character) => character.id === characterId) ?? null;

    if (
      !selectedCharacter ||
      getCharacterTier(getCharacterTotalLevel(selectedCharacter)) !== Number(game.tier.replace("TIER_", ""))
    ) {
      return "wrong-tier";
    }

    const availableSpots = Math.max((game.seatCapacity ?? 0) - game.participants.length, 0);

    if (availableSpots <= 0) {
      return "full";
    }

    await tx.gameParticipant.create({
      data: {
        gameId: game.id,
        characterId,
        userId: user.id,
        logStatus: "APPROVED",
        approvedAt: null,
        logRewardsSummary: null,
        logMagicItemsAwarded: null,
        logConsumablesAwarded: null,
        logSessionNotes: null,
      },
    });

    return "success";
  });

  revalidatePath("/");
  revalidatePath("/league");
  revalidatePath(`/league/games/${gameId}`);
  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);

  if (result === "missing") {
    redirect("/league");
  }

  redirectToSignupState(gameId, result);
}

export async function leaveLeagueGame(formData: FormData) {
  const user = await requireRole("PLAYER");
  const gameId = String(formData.get("gameId") ?? "").trim();

  if (!gameId) {
    redirect("/league");
  }

  const supportEmail = getLeagueSupportEmail();
  const result = await prisma.$transaction(async (tx) => {
    const participant = await tx.gameParticipant.findFirst({
      where: {
        gameId,
        userId: user.id,
      },
      include: {
        character: {
          select: {
            id: true,
            name: true,
          },
        },
        game: {
          select: {
            id: true,
            adventureCode: true,
            datePlayed: true,
            status: true,
            ticketPrice: true,
            tier: true,
            title: true,
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!participant) {
      return {
        gameId,
        state: "not-signed-up" as const,
      };
    }

    if (participant.game.status !== "SCHEDULED") {
      return {
        gameId,
        state: "closed" as const,
      };
    }

    const matchingOrderSummaries: string[] = [];
    const requiresRefundReview = isPaidTicketPrice(participant.game.ticketPrice);

    if (requiresRefundReview) {
      const relevantOrders = await tx.checkoutOrder.findMany({
        where: {
          checkoutType: "LEAGUE",
          status: "COMPLETED",
          OR: [
            {
              userId: user.id,
            },
            {
              payerEmail: participant.user.email,
            },
            {
              recipientDataJson: {
                contains: participant.user.email,
              },
            },
          ],
        },
        orderBy: [
          {
            capturedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

      for (const order of relevantOrders) {
        const matchingItems = parseSerializedLeagueCheckoutItems(order.itemDataJson).filter(
          (item) => item.gameId === participant.game.id,
        );

        for (const item of matchingItems) {
          const guestEmails = Array.isArray(item.guestEmails)
            ? item.guestEmails.filter((email): email is string => typeof email === "string" && Boolean(email))
            : [];
          const capturedAtLabel = formatDateTime(order.capturedAt ?? order.createdAt);
          const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;

          matchingOrderSummaries.push(
            [
              `Order ${order.paypalOrderId}`,
              `${item.title ?? participant.game.title} x${quantity}`,
              item.ticketPrice ?? participant.game.ticketPrice,
              `captured ${capturedAtLabel}`,
              item.characterName ? `character ${item.characterName}` : "",
              order.payerEmail ? `payer ${order.payerEmail}` : "",
              guestEmails.length ? `guests ${guestEmails.join(", ")}` : "",
            ]
              .filter(Boolean)
              .join(" | "),
          );
        }
      }
    }

    await tx.gameParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    return {
      characterId: participant.character.id,
      gameAdventureCode: participant.game.adventureCode,
      gameDateTime: formatDateTime(participant.game.datePlayed),
      gameId: participant.game.id,
      gamePath: `/league/games/${participant.game.id}`,
      gameTier: formatTier(participant.game.tier),
      gameTitle: participant.game.title,
      matchingOrderSummaries,
      playerEmail: participant.user.email,
      playerName: participant.user.name,
      requiresRefundReview,
      state: "success" as const,
      supportEmail,
      characterName: participant.character.name,
    };
  });

  if (result.state === "success") {
    revalidatePath("/");
    revalidatePath("/league");
    revalidatePath(`/league/games/${result.gameId}`);
    revalidatePath("/player");
    revalidatePath(`/player/characters/${result.characterId}`);

    if (result.requiresRefundReview) {
      try {
        await sendLeagueRefundRequestEmail({
          characterName: result.characterName,
          gameAdventureCode: result.gameAdventureCode,
          gameDateTime: result.gameDateTime,
          gamePath: result.gamePath,
          gameTier: result.gameTier,
          gameTitle: result.gameTitle,
          matchingOrderSummaries: result.matchingOrderSummaries,
          playerEmail: result.playerEmail,
          playerName: result.playerName,
          to: result.supportEmail,
        });
        await sendLeagueRefundRequestConfirmationEmail({
          gameAdventureCode: result.gameAdventureCode,
          gameDateTime: result.gameDateTime,
          gamePath: result.gamePath,
          gameTitle: result.gameTitle,
          playerName: result.playerName,
          supportEmail: result.supportEmail,
          to: result.playerEmail,
        });
        redirectToLeaveState(result.gameId, "refund-requested");
      } catch (error) {
        console.error("Unable to send league refund request email.", error);
        redirectToLeaveState(result.gameId, "refund-contact-required");
      }
    }

    redirectToLeaveState(result.gameId, "success");
  }

  if (result.state === "not-signed-up") {
    redirectToLeaveState(result.gameId, result.state);
  }

  redirectToLeaveState(gameId, result.state);
}
