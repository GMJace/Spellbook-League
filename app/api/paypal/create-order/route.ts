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
import {
  getCombinedSalesTaxRatePct,
  normalizeTicketSalesRateSettings,
} from "@/lib/checkout-pricing";
import {
  grantGrimoireGuildMembership,
  getGrimoireGuildMembershipSettings,
} from "@/lib/grimoire-guild-membership";
import { formatPayPalAmount, paypalRequest } from "@/lib/paypal";
import type { PayPalCheckoutPayload } from "@/lib/paypal-checkout-types";
import { ensureAutomaticTicketPayoutsForCheckoutOrder } from "@/lib/ticket-payouts";
import { createSaleReceiptNumber } from "@/lib/ticket-receipts";
import { prisma } from "@/lib/prisma";
import { releaseExpiredStoreCreditReservations, roundUsdAmount } from "@/lib/store-credit";
import { processCompletedGrimTidingsCheckout } from "@/lib/tidings";
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

type DirectCreditCheckoutResponse = {
  completed: true;
  payerEmail: null | string;
  storeCreditAppliedUsd: number;
  success: true;
};

type CanonicalCheckout = {
  checkoutType: CheckoutType;
  itemDataJson: string;
  purchaseUnits: Array<{
    amount: {
      breakdown: {
        discount?: {
          currency_code: "USD";
          value: string;
        };
        item_total: {
          currency_code: "USD";
          value: string;
        };
        tax_total?: {
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
  subtotalUsd: number;
  summaryText: string;
  taxUsd: number;
  totalUsd: number;
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
    grimTidingCost: number;
    isGrimTidings: boolean;
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
      grimTidingCost: item.grimTidingCost,
      isGrimTidings: item.isGrimTidings,
      quantity: item.quantity,
      ticketPrice: game?.ticketPrice ?? "Unknown",
      title: game?.title ?? "Unknown game",
    };
  });
}

async function buildLeagueCheckout(
  payload: Extract<PayPalCheckoutPayload, { checkoutType: "LEAGUE" }>,
  salesTaxRatePct: number,
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
    grimTidingCost: number;
    isGrimTidings: boolean;
    quantity: number;
  }> = [];
  const summaryParts: string[] = [];
  let subtotalUsd = 0;
  let hasGrimTidingsSelections = false;
  let hasPaidLeagueSelections = false;

  if (payload.membershipQuantity > 0) {
    if (!membershipSettings?.isActive) {
      throw new Error("Grimoire Guild membership is not available right now.");
    }

    subtotalUsd += membershipSettings.priceUsd * payload.membershipQuantity;
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

    if (game.isGrimTidings) {
      hasGrimTidingsSelections = true;

      if (item.quantity !== 1) {
        throw new Error(`${game.title} can only be checked out one seat at a time.`);
      }

      if (item.guestEmails.length > 0) {
        throw new Error(`${game.title} cannot include guest tickets in the cart.`);
      }
    } else if (!isPaidTicketPrice(game.ticketPrice)) {
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

    if (!game.isGrimTidings) {
      hasPaidLeagueSelections = true;
      const unitPriceUsd = parseTicketPriceUsd(game.ticketPrice);
      subtotalUsd += unitPriceUsd * item.quantity;
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
    } else {
      summaryParts.push(
        `${game.title} x${item.quantity} (${game.grimTidingCost} Tiding${game.grimTidingCost === 1 ? "" : "s"}); Character: ${getParticipantCharacterLabel(character?.name)}`,
      );
    }

    serializedItems.push({
      characterId: character?.id ?? null,
      characterName: getParticipantCharacterLabel(character?.name),
      gameId: item.gameId,
      guestEmails: item.guestEmails,
      grimTidingCost: Math.max(game.grimTidingCost ?? 1, 1),
      isGrimTidings: game.isGrimTidings,
      quantity: item.quantity,
    });
  }

  if (hasGrimTidingsSelections && (hasPaidLeagueSelections || payload.membershipQuantity > 0)) {
    throw new Error("Grim Tidings games must be checked out separately from paid league games and memberships.");
  }

  if (!subtotalUsd && !hasGrimTidingsSelections) {
    throw new Error("Select a paid league ticket, a Grim Tidings game, or the Grimoire Guild membership before checkout.");
  }

  const taxUsd = roundUsdAmount(subtotalUsd * (salesTaxRatePct / 100));
  const totalUsd = roundUsdAmount(subtotalUsd + taxUsd);

  return {
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
              value: formatPayPalAmount(subtotalUsd),
            },
            ...(taxUsd > 0
              ? {
                  tax_total: {
                    currency_code: "USD" as const,
                    value: formatPayPalAmount(taxUsd),
                  },
                }
              : {}),
          },
          currency_code: "USD",
          value: formatPayPalAmount(totalUsd),
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
    subtotalUsd,
    summaryText: summaryParts.join(" | "),
    taxUsd,
    totalUsd,
  };
}

async function buildGrimoireCheckout(
  payload: Extract<PayPalCheckoutPayload, { checkoutType: "GRIMOIRE" }>,
  salesTaxRatePct: number,
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
      ? "Tome Key Badge"
      : nextEvent.ticketLabel;
  let subtotalUsd = 0;

  if (payload.badgeQuantity > 0) {
    subtotalUsd += badgeUnitPriceUsd * payload.badgeQuantity;
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

    subtotalUsd += game.ticketPriceUsd * item.quantity;
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

  if (!subtotalUsd) {
    throw new Error("Add a badge or at least one Grimoire ticket before checkout.");
  }

  if (payload.isGiftPurchase && payload.receiverEmails.length) {
    summaryParts.push(`Receivers: ${payload.receiverEmails.join(", ")}`);
  }

  const taxUsd = roundUsdAmount(subtotalUsd * (salesTaxRatePct / 100));
  const totalUsd = roundUsdAmount(subtotalUsd + taxUsd);

  return {
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
              value: formatPayPalAmount(subtotalUsd),
            },
            ...(taxUsd > 0
              ? {
                  tax_total: {
                    currency_code: "USD" as const,
                    value: formatPayPalAmount(taxUsd),
                  },
                }
              : {}),
          },
          currency_code: "USD",
          value: formatPayPalAmount(totalUsd),
        },
        description: "SPELLBOOK Grimoire tickets",
        items: paypalItems,
      },
    ],
    recipientDataJson: JSON.stringify({
      isGiftPurchase: payload.isGiftPurchase,
      receiverEmails: payload.receiverEmails,
    }),
    subtotalUsd,
    summaryText: summaryParts.join(" | "),
    taxUsd,
    totalUsd,
  };
}

function getLeagueCheckoutMembershipFromValue(
  serializedValue: string,
): null | {
  durationDays: number;
  productName: string;
  quantity: number;
} {
  try {
    const parsed = JSON.parse(serializedValue) as {
      membership?: {
        durationDays?: number;
        productName?: string;
        quantity?: number;
      } | null;
    };

    if (
      !parsed?.membership ||
      typeof parsed.membership.durationDays !== "number" ||
      typeof parsed.membership.productName !== "string" ||
      typeof parsed.membership.quantity !== "number" ||
      parsed.membership.quantity < 1
    ) {
      return null;
    }

    return {
      durationDays: parsed.membership.durationDays,
      productName: parsed.membership.productName,
      quantity: parsed.membership.quantity,
    };
  } catch {
    return null;
  }
}

function applyStoreCreditToPurchaseUnits(
  checkout: CanonicalCheckout,
  storeCreditAppliedUsd: number,
) {
  if (storeCreditAppliedUsd <= 0) {
    return checkout.purchaseUnits;
  }

  const payableAmountUsd = roundUsdAmount(
    Math.max(checkout.totalUsd - storeCreditAppliedUsd, 0),
  );

  return checkout.purchaseUnits.map((purchaseUnit) => ({
    ...purchaseUnit,
    amount: {
      ...purchaseUnit.amount,
      breakdown: {
        ...purchaseUnit.amount.breakdown,
        discount: {
          currency_code: "USD" as const,
          value: formatPayPalAmount(storeCreditAppliedUsd),
        },
        item_total: {
          ...purchaseUnit.amount.breakdown.item_total,
          value: formatPayPalAmount(checkout.subtotalUsd),
        },
        ...(checkout.taxUsd > 0
          ? {
              tax_total: {
                currency_code: "USD" as const,
                value: formatPayPalAmount(checkout.taxUsd),
              },
            }
          : {}),
      },
      value: formatPayPalAmount(payableAmountUsd),
    },
  }));
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
    await releaseExpiredStoreCreditReservations(prisma);

    const session = await auth();
    const salesTaxSettings = normalizeTicketSalesRateSettings(
      await prisma.ticketSalesSettings.findUnique({
        where: {
          id: "default",
        },
      }),
    );
    const salesTaxRatePct = getCombinedSalesTaxRatePct(salesTaxSettings);
    const canonicalCheckout =
      parsed.data.checkoutType === "LEAGUE"
        ? await buildLeagueCheckout(parsed.data, salesTaxRatePct)
        : await buildGrimoireCheckout(parsed.data, salesTaxRatePct);
    const checkoutUser = session?.user?.id
      ? await prisma.user.findUnique({
          where: {
            id: session.user.id,
          },
          select: {
            email: true,
            id: true,
            storeCreditHeldUsd: true,
            storeCreditUsd: true,
          },
        })
      : null;
    const availableStoreCreditUsd = checkoutUser
      ? roundUsdAmount(Math.max(checkoutUser.storeCreditUsd - checkoutUser.storeCreditHeldUsd, 0))
      : 0;
    const storeCreditAppliedUsd = roundUsdAmount(
      Math.min(availableStoreCreditUsd, canonicalCheckout.totalUsd),
    );
    const payableAmountUsd = roundUsdAmount(
      Math.max(canonicalCheckout.totalUsd - storeCreditAppliedUsd, 0),
    );

    if (payableAmountUsd <= 0) {
      if (!checkoutUser) {
        throw new Error("Sign in before completing checkout.");
      }

      const completedCheckout = await prisma.$transaction(async (tx) => {
        const completedAt = new Date();
        const currentUser = await tx.user.findUnique({
          where: {
            id: checkoutUser.id,
          },
          select: {
            email: true,
            id: true,
            storeCreditHeldUsd: true,
            storeCreditUsd: true,
          },
        });

        if (!currentUser) {
          throw new Error("That account could not be found for store credit checkout.");
        }

        const currentAvailableStoreCreditUsd = roundUsdAmount(
          Math.max(currentUser.storeCreditUsd - currentUser.storeCreditHeldUsd, 0),
        );

        if (currentAvailableStoreCreditUsd < canonicalCheckout.totalUsd) {
          throw new Error("Your available store credit changed. Refresh the cart and try again.");
        }

        await tx.user.update({
          where: {
            id: currentUser.id,
          },
          data: {
            storeCreditUsd: roundUsdAmount(currentUser.storeCreditUsd - canonicalCheckout.totalUsd),
          },
        });

        const completedOrder = await tx.checkoutOrder.create({
          data: {
            amountUsd: 0,
            checkoutType: canonicalCheckout.checkoutType,
            capturedAt: completedAt,
            itemDataJson: canonicalCheckout.itemDataJson,
            payerEmail: currentUser.email,
            paypalOrderId: `STORE-CREDIT-${crypto.randomUUID()}`,
            provider: "STORE_CREDIT",
            receiptNumber: createSaleReceiptNumber(completedAt),
            recipientDataJson: canonicalCheckout.recipientDataJson,
            status: "COMPLETED",
            storeCreditAppliedUsd: canonicalCheckout.totalUsd,
            subtotalUsd: canonicalCheckout.subtotalUsd,
            taxUsd: canonicalCheckout.taxUsd,
            summaryText: canonicalCheckout.summaryText,
            userId: currentUser.id,
          },
        });

        if (canonicalCheckout.checkoutType === "LEAGUE") {
          await processCompletedGrimTidingsCheckout(tx, {
            itemDataJson: canonicalCheckout.itemDataJson,
            userId: currentUser.id,
          });
        }

        return completedOrder;
      });

      const membership = getLeagueCheckoutMembershipFromValue(canonicalCheckout.itemDataJson);

      if (
        canonicalCheckout.checkoutType === "LEAGUE" &&
        membership &&
        checkoutUser.id
      ) {
        await grantGrimoireGuildMembership({
          checkoutOrderId: completedCheckout.id,
          durationDays: membership.durationDays,
          productName: membership.productName,
          userId: checkoutUser.id,
        });
      }

      try {
        await ensureAutomaticTicketPayoutsForCheckoutOrder(completedCheckout.id);
      } catch (error) {
        console.error("Unable to create automatic ticket payouts after store credit checkout.", error);
      }

      return NextResponse.json({
        completed: true,
        payerEmail: checkoutUser.email ?? null,
        storeCreditAppliedUsd: canonicalCheckout.totalUsd,
        success: true,
      } satisfies DirectCreditCheckoutResponse);
    }

    const order = await paypalRequest<PayPalCreateOrderResponse>(
      "/v2/checkout/orders",
      {
        body: {
          intent: "CAPTURE",
          purchase_units: applyStoreCreditToPurchaseUnits(
            canonicalCheckout,
            storeCreditAppliedUsd,
          ),
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

    await prisma.$transaction(async (tx) => {
      if (checkoutUser && storeCreditAppliedUsd > 0) {
        const currentUser = await tx.user.findUnique({
          where: {
            id: checkoutUser.id,
          },
          select: {
            id: true,
            storeCreditHeldUsd: true,
            storeCreditUsd: true,
          },
        });

        if (!currentUser) {
          throw new Error("That account could not be found for store credit checkout.");
        }

        const currentAvailableStoreCreditUsd = roundUsdAmount(
          Math.max(currentUser.storeCreditUsd - currentUser.storeCreditHeldUsd, 0),
        );

        if (currentAvailableStoreCreditUsd < storeCreditAppliedUsd) {
          throw new Error("Your available store credit changed. Refresh the cart and try again.");
        }

        await tx.user.update({
          where: {
            id: currentUser.id,
          },
          data: {
            storeCreditHeldUsd: roundUsdAmount(
              currentUser.storeCreditHeldUsd + storeCreditAppliedUsd,
            ),
          },
        });
      }

      await tx.checkoutOrder.create({
        data: {
          amountUsd: payableAmountUsd,
          checkoutType: canonicalCheckout.checkoutType,
          itemDataJson: canonicalCheckout.itemDataJson,
          paypalOrderId: order.id,
          receiptNumber: createSaleReceiptNumber(),
          recipientDataJson: canonicalCheckout.recipientDataJson,
          storeCreditAppliedUsd,
          subtotalUsd: canonicalCheckout.subtotalUsd,
          taxUsd: canonicalCheckout.taxUsd,
          summaryText: canonicalCheckout.summaryText,
          userId: session?.user?.id ?? null,
        },
      });
    });

    return NextResponse.json({ id: order.id });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create PayPal checkout.",
      400,
    );
  }
}
