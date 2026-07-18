import { auth } from "@/auth";
import type { CheckoutType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getNextGrimoireEvent, getCuratedGamesForEvent } from "@/lib/grimoire-server";
import { formatPayPalAmount, paypalRequest } from "@/lib/paypal";
import type { PayPalCheckoutPayload } from "@/lib/paypal-checkout-types";
import { prisma } from "@/lib/prisma";
import { isPaidTicketPrice, parseTicketPriceUsd } from "@/lib/utils";

const leagueItemSchema = z.object({
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
    items: z.array(leagueItemSchema).min(1),
  }),
  z.object({
    checkoutType: z.literal("GRIMOIRE"),
    badgeQuantity: z.number().int().min(0).max(12),
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
  items: Array<{ gameId: string; quantity: number; guestEmails: string[] }>,
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
  const paypalItems: CanonicalCheckout["purchaseUnits"][number]["items"] = [];
  const summaryParts: string[] = [];
  let amountUsd = 0;

  for (const item of payload.items) {
    const game = gamesById.get(item.gameId);

    if (!game) {
      throw new Error("One or more selected league games are no longer available.");
    }

    if (!isPaidTicketPrice(game.ticketPrice)) {
      throw new Error(`${game.title} is not a paid checkout game.`);
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
      `${game.title} x${item.quantity} (${game.ticketPrice})${emailSummary}`,
    );
  }

  if (!amountUsd) {
    throw new Error("Select at least one paid league ticket before checkout.");
  }

  return {
    amountUsd,
    checkoutType: "LEAGUE",
    itemDataJson: JSON.stringify(serializeLeagueItems(payload.items, gamesById)),
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
        description: "SPELLBOOK League tickets",
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
  let amountUsd = 0;

  if (payload.badgeQuantity > 0) {
    amountUsd += nextEvent.ticketPriceUsd * payload.badgeQuantity;
    paypalItems.push({
      name: nextEvent.ticketLabel.slice(0, 120),
      quantity: String(payload.badgeQuantity),
      unit_amount: {
        currency_code: "USD",
        value: formatPayPalAmount(nextEvent.ticketPriceUsd),
      },
    });
    summaryParts.push(
      `${nextEvent.ticketLabel} x${payload.badgeQuantity} (${nextEvent.ticketPrice})`,
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
      eventId: nextEvent.id,
      eventLabel: nextEvent.ticketLabel,
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
