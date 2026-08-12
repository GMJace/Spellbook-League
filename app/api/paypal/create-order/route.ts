import { auth } from "@/auth";
import { getCharacterTier, getCharacterTotalLevel } from "@/lib/character";
import type { CheckoutType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getNextGrimoireEvent, getCuratedGamesForEvent } from "@/lib/grimoire-server";
import {
  getParticipantCharacterLabel,
  normalizeParticipantCharacterId,
} from "@/lib/game-participants";
import { getGrimoireGuildMembershipSettings } from "@/lib/grimoire-guild-membership";
import { formatPayPalAmount, paypalRequest } from "@/lib/paypal";
import type { PayPalCheckoutPayload } from "@/lib/paypal-checkout-types";
import { prisma } from "@/lib/prisma";
import { getTierValue, isPaidTicketPrice, parseTicketPriceUsd } from "@/lib/utils";

const leagueItemSchema = z.object({
  characterId: z.string().trim().min(1),
  gameId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(12),
  guestEmails: z.array(z.string().email()).max(11),
});

const grimoireItemSchema = z.object({
  slug: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(12),
});

const checkoutPayloadSchema = z.discriminatedUnion("checkoutType", [
  z.object({
    checkoutType: z.literal("LEAGUE"),
    membershipQuantity: z.number().int().min(0).max(1).default(0),
    items: z.array(leagueItemSchema),
  }),
  z.object({
    checkoutType: z.literal("GRIMOIRE"),
    badgeQuantity: z.number().int().min(0).max(12),
    badgeType: z.enum(["REGULAR", "FLYING_CARPET"]),
    isGiftPurchase: z.boolean(),
    receiverEmails: z.array(z.string().email()).max(12),
    items: z.array(grimoireItemSchema),
  }),
]);

type PayPalCreateOrderResponse = {
  id: string;
  status: string;
};

type CanonicalCheckout = {
  amountUsd: number;
  checkoutType: CheckoutType;
  itemDataJson: string;
  purchaseUnits: Array<{
    amount: {
      breakdown: {
        item_total: {
          currency_code: "USD";
          value: string;
        };
      };
      currency_code: "USD";
      value: string;
    };
    description: string;
    items: Array<{
      name: string;
      quantity: string;
      unit_amount: {
        currency_code: "USD";
        value: string;
      };
    }>;
  }>;
  recipientDataJson: string;
  summaryText: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function serializeLeagueItems(
  items: Array<{
    characterId: null | string;
    characterName: string;
    gameId: string;
    guestEmails: string[];
    quantity: number;
  }>,
  gamesById: Map<
    string,
    {
      adventureCode: string;
      ticketPrice: string;
      title: string;
    }
  >,
) {
  return items.map((item) => {
    const game = gamesById.get(item.gameId);

    return {
      characterId: item.characterId,
      characterName: item.characterName,
      gameId: item.gameId,
      guestEmails: item.guestEmails,
      quantity: item.quantity,
      ticketPrice: game?.ticketPrice ?? "Unknown",
      title: game?.title ?? "Unknown game",
    };
  });
}

async function buildLeagueCheckout(
  payload: Extract<PayPalCheckoutPayload, { checkoutType: "LEAGUE" }>,
): Promise<CanonicalCheckout> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Sign in with a player account before checking out for a league game.");
  }

  const player = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      roles: true,
      characters: {
        select: {
          id: true,
          name: true,
          class1Level: true,
          class2Level: true,
          class3Level: true,
        },
      },
    },
  });

  if (!player || !player.roles.some((role) => role.role === "PLAYER")) {
    throw new Error("A player account is required before checking out for a league game.");
  }

  const gameIds = [...new Set(payload.items.map((item) => item.gameId))];
  const games = await prisma.game.findMany({
    where: {
      id: { in: gameIds },
      status: "SCHEDULED",
      datePlayed: {
        gte: new Date(),
      },
    },
    include: {
      participants: {
        where: {
          userId: player.id,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      _count: {
        select: {
          participants: true,
        },
      },
    },
  });

  if (games.length !== gameIds.length) {
    throw new Error("One or more selected league games are no longer available.");
  }

  const gamesById = new Map(games.map((game) => [game.id, game]));
  const membershipSettings =
    payload.membershipQuantity > 0
      ? await getGrimoireGuildMembershipSettings()
      : null;
  const paypalItems: CanonicalCheckout["purchaseUnits"][number]["items"] = [];
  const serializedItems: Array<{
    characterId: null | string;
    characterName: string;
    gameId: string;
    guestEmails: string[];
    quantity: number;
  }> = [];
  const summaryParts: string[] = [];
  let amountUsd = 0;

  if (payload.membershipQuantity > 0) {
    if (!membershipSettings?.isActive) {
      throw new Error("Grimoire Guild membership is not available right now.");
    }

    amountUsd += membershipSettings.priceUsd * payload.membershipQuantity;
    paypalItems.push({
      name: membershipSettings.productName.slice(0, 120),
      quantity: String(payload.membershipQuantity),
      unit_amount: {
        currency_code: "USD",
        value: formatPayPalAmount(membershipSettings.priceUsd),
      },
    });
    summaryParts.push(
      `${membershipSettings.productName} x${payload.membershipQuantity} (${formatPayPalAmount(membershipSettings.priceUsd)} USD)`,
    );
  }

  for (const item of payload.items) {
    const game = gamesById.get(item.gameId);
    const selectedCharacterId = normalizeParticipantCharacterId(item.characterId);
    const character = selectedCharacterId
      ? player.characters.find((entry) => entry.id === selectedCharacterId)
      : null;

    if (!game) {
      throw new Error("One or more selected league games are no longer available.");
    }

    if (selectedCharacterId && !character) {
      throw new Error("Choose one of your characters for each league game before checkout.");
    }

    if (!isPaidTicketPrice(game.ticketPrice)) {
      throw new Error(`${game.title} is not a paid checkout game.`);
    }

    if (game.participants.length > 0) {
      throw new Error(`You are already signed up for ${game.title}.`);
    }

    if (
      character &&
      getCharacterTier(getCharacterTotalLevel(character)) !== getTierValue(game.tier)
    ) {
      throw new Error(`${character.name} does not match the tier for ${game.title}.`);
    }

    const openSeats = Math.max(game.seatCapacity - game._count.participants, 0);

    if (item.quantity > openSeats) {
      throw new Error(`${game.title} does not have enough remaining seats.`);
    }

    const unitPriceUsd = parseTicketPriceUsd(game.ticketPrice);
    amountUsd += unitPriceUsd * item.quantity;
    paypalItems.push({
      name: game.title.slice(0, 120),
      quantity: String(item.quantity),
      unit_amount: {
        currency_code: "USD",
        value: formatPayPalAmount(unitPriceUsd),
      },
    });

    const emailSummary = item.guestEmails.length
      ? `; Guest emails: ${item.guestEmails.join(", ")}`
      : "";
    summaryParts.push(
      `${game.title} x${item.quantity} (${game.ticketPrice}); Character: ${getParticipantCharacterLabel(character?.name)}${emailSummary}`,
    );
    serializedItems.push({
      characterId: character?.id ?? null,
      characterName: getParticipantCharacterLabel(character?.name),
      gameId: item.gameId,
      guestEmails: item.guestEmails,
      quantity: item.quantity,
    });
  }

  if (!amountUsd) {
    throw new Error("Select a paid league ticket or the Grimoire Guild membership before checkout.");
  }

  return {
    amountUsd,
    checkoutType: "LEAGUE",
    itemDataJson: JSON.stringify({
      games: serializeLeagueItems(serializedItems, gamesById),
      membership:
        payload.membershipQuantity > 0 && membershipSettings
          ? {
              durationDays: membershipSettings.durationDays,
              priceUsd: membershipSettings.priceUsd,
              productName: membershipSettings.productName,
              quantity: payload.membershipQuantity,
            }
          : null,
    }),
    purchaseUnits: [
      {
        amount: {
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: formatPayPalAmount(amountUsd),
            },
          },
          currency_code: "USD",
          value: formatPayPalAmount(amountUsd),
        },
        description:
          payload.membershipQuantity > 0
            ? "SPELLBOOK League tickets and memberships"
            : "SPELLBOOK League tickets",
        items: paypalItems,
      },
    ],
    recipientDataJson: JSON.stringify(
      payload.items.flatMap((item) => item.guestEmails),
    ),
    summaryText: summaryParts.join(" | "),
  };
}

async function buildGrimoireCheckout(
  payload: Extract<PayPalCheckoutPayload, { checkoutType: "GRIMOIRE" }>,
): Promise<CanonicalCheckout> {
  const nextEvent = await getNextGrimoireEvent();

  if (!nextEvent) {
    throw new Error("No Grimoire event is currently available for checkout.");
  }

  if (payload.badgeQuantity < 1 && payload.items.length === 0) {
    throw new Error("Add a badge or at least one Grimoire ticket before checkout.");
  }

  if (payload.items.length > 0 && payload.badgeQuantity < 1) {
    throw new Error("A Grimoire badge is required before purchasing game tickets.");
  }

  const curatedGames = await getCuratedGamesForEvent(nextEvent.id);
  const gamesBySlug = new Map(curatedGames.map((game) => [game.slug, game]));
  const paypalItems: CanonicalCheckout["purchaseUnits"][number]["items"] = [];
  const summaryParts: string[] = [];
  const badgeUnitPriceUsd =
    payload.badgeType === "FLYING_CARPET"
      ? nextEvent.ticketPriceUsd * 2
      : nextEvent.ticketPriceUsd;
  const badgeLabel =
    payload.badgeType === "FLYING_CARPET"
      ? "Flying Carpet Badge"
      : nextEvent.ticketLabel;
  let amountUsd = 0;

  if (payload.badgeQuantity > 0) {
    amountUsd += badgeUnitPriceUsd * payload.badgeQuantity;
    paypalItems.push({
      name: badgeLabel.slice(0, 120),
      quantity: String(payload.badgeQuantity),
      unit_amount: {
        currency_code: "USD",
        value: formatPayPalAmount(badgeUnitPriceUsd),
      },
    });
    summaryParts.push(
      `${badgeLabel} x${payload.badgeQuantity} (${formatPayPalAmount(badgeUnitPriceUsd)} USD)`,
    );
  }

  for (const item of payload.items) {
    const game = gamesBySlug.get(item.slug);

    if (!game) {
      throw new Error("One or more selected Grimoire games are no longer available.");
    }

    if (item.quantity > game.seatCapacity) {
      throw new Error(`${game.game} does not have enough remaining seats.`);
    }

    amountUsd += game.ticketPriceUsd * item.quantity;
    paypalItems.push({
      name: game.game.slice(0, 120),
      quantity: String(item.quantity),
      unit_amount: {
        currency_code: "USD",
        value: formatPayPalAmount(game.ticketPriceUsd),
      },
    });
    summaryParts.push(`${game.game} x${item.quantity} (${game.ticketPrice})`);
  }

  if (!amountUsd) {
    throw new Error("Add a badge or at least one Grimoire ticket before checkout.");
  }

  if (payload.isGiftPurchase && payload.receiverEmails.length) {
    summaryParts.push(`Receivers: ${payload.receiverEmails.join(", ")}`);
  }

  return {
    amountUsd,
    checkoutType: "GRIMOIRE",
    itemDataJson: JSON.stringify({
      badgeQuantity: payload.badgeQuantity,
      badgeType: payload.badgeType,
      badgeLabel,
      badgeUnitPriceUsd,
      eventId: nextEvent.id,
      eventLabel: badgeLabel,
      games: payload.items.map((item) => {
        const game = gamesBySlug.get(item.slug);
        return {
          quantity: item.quantity,
          slug: item.slug,
          ticketPrice: game?.ticketPrice ?? "Unknown",
          title: game?.game ?? "Unknown game",
        };
      }),
    }),
    purchaseUnits: [
      {
        amount: {
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: formatPayPalAmount(amountUsd),
            },
          },
          currency_code: "USD",
          value: formatPayPalAmount(amountUsd),
        },
        description: "SPELLBOOK Grimoire tickets",
        items: paypalItems,
      },
    ],
    recipientDataJson: JSON.stringify({
      isGiftPurchase: payload.isGiftPurchase,
      receiverEmails: payload.receiverEmails,
    }),
    summaryText: summaryParts.join(" | "),
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid checkout payload.", 400);
  }

  const parsed = checkoutPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid checkout payload.",
      400,
    );
  }

  try {
    const session = await auth();
    const canonicalCheckout =
      parsed.data.checkoutType === "LEAGUE"
        ? await buildLeagueCheckout(parsed.data)
        : await buildGrimoireCheckout(parsed.data);

    const order = await paypalRequest<PayPalCreateOrderResponse>(
      "/v2/checkout/orders",
      {
        body: {
          intent: "CAPTURE",
          purchase_units: canonicalCheckout.purchaseUnits,
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: "SPELLBOOK",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
              },
            },
          },
        },
      },
    );

    if (!order) {
      throw new Error("PayPal did not return an order response.");
    }

    await prisma.checkoutOrder.create({
      data: {
        amountUsd: canonicalCheckout.amountUsd,
        checkoutType: canonicalCheckout.checkoutType,
        itemDataJson: canonicalCheckout.itemDataJson,
        paypalOrderId: order.id,
        recipientDataJson: canonicalCheckout.recipientDataJson,
        summaryText: canonicalCheckout.summaryText,
        userId: session?.user?.id ?? null,
      },
    });

    return NextResponse.json({ id: order.id });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create PayPal checkout.",
      400,
    );
  }
}
