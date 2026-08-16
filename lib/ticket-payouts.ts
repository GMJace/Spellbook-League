import type { CheckoutStatus, CheckoutType, PrismaClient, TicketSaleSourceType } from "@prisma/client";

import { normalizeTicketSalesRateSettings } from "@/lib/checkout-pricing";
import { prisma } from "@/lib/prisma";
import {
  buildDmPayoutCandidates,
  buildGrimoireTicketSaleRows,
  buildLeagueTicketSaleRows,
  calculatePayoutAmount,
} from "@/lib/ticket-sales";

type CheckoutOrderForAutomaticPayouts = {
  amountUsd: number;
  capturedAt: Date | null;
  checkoutType: CheckoutType;
  createdAt: Date;
  id: string;
  itemDataJson: string;
  payerEmail: null | string;
  paypalOrderId: string;
  receiptNumber: null | string;
  status: CheckoutStatus;
  summaryText: string;
};

function parseLeagueGameIds(itemDataJson: string) {
  try {
    const parsed = JSON.parse(itemDataJson) as {
      games?: Array<{
        gameId?: string;
      }>;
    };

    return Array.isArray(parsed?.games)
      ? parsed.games
          .map((game) => (typeof game?.gameId === "string" ? game.gameId : null))
          .filter((gameId): gameId is string => Boolean(gameId))
      : [];
  } catch {
    return [];
  }
}

function parseGrimoireSelection(itemDataJson: string) {
  try {
    const parsed = JSON.parse(itemDataJson) as {
      eventId?: string;
      games?: Array<{
        slug?: string;
      }>;
    };

    return {
      eventId: typeof parsed?.eventId === "string" ? parsed.eventId : "",
      slugs: Array.isArray(parsed?.games)
        ? parsed.games
            .map((game) => (typeof game?.slug === "string" ? game.slug : null))
            .filter((slug): slug is string => Boolean(slug))
        : [],
    };
  } catch {
    return {
      eventId: "",
      slugs: [],
    };
  }
}

export async function ensureAutomaticTicketPayoutsForCheckoutOrder(
  checkoutOrderId: string,
  db: PrismaClient = prisma,
) {
  const checkoutOrder = await db.checkoutOrder.findUnique({
    where: {
      id: checkoutOrderId,
    },
    select: {
      amountUsd: true,
      capturedAt: true,
      checkoutType: true,
      createdAt: true,
      id: true,
      itemDataJson: true,
      payerEmail: true,
      paypalOrderId: true,
      receiptNumber: true,
      status: true,
      summaryText: true,
    },
  });

  if (!checkoutOrder || checkoutOrder.status !== "COMPLETED") {
    return;
  }

  const ticketSalesSettings = normalizeTicketSalesRateSettings(
    await db.ticketSalesSettings.findUnique({
      where: {
        id: "default",
      },
    }),
  );
  const paymentProfiles = await db.dmPaymentProfile.findMany({
    orderBy: [{ dmName: "asc" }],
  });

  let payoutCandidates: ReturnType<typeof buildDmPayoutCandidates> = [];

  if (checkoutOrder.checkoutType === "LEAGUE") {
    const gameIds = parseLeagueGameIds(checkoutOrder.itemDataJson);
    const games = gameIds.length
      ? await db.game.findMany({
          where: {
            id: {
              in: gameIds,
            },
          },
          select: {
            datePlayed: true,
            dm: {
              select: {
                name: true,
              },
            },
            dmId: true,
            dmName: true,
            id: true,
            ticketPrice: true,
            title: true,
          },
        })
      : [];

    payoutCandidates = buildDmPayoutCandidates({
      grimoireRows: [],
      leagueRows: buildLeagueTicketSaleRows(
        [checkoutOrder as CheckoutOrderForAutomaticPayouts],
        games,
      ),
      paymentProfiles,
    });
  } else {
    const grimoireSelection = parseGrimoireSelection(checkoutOrder.itemDataJson);
    const [curatedGames, events] = await Promise.all([
      grimoireSelection.slugs.length
        ? db.grimoireCuratedGame.findMany({
            where: {
              slug: {
                in: grimoireSelection.slugs,
              },
            },
            select: {
              dm: true,
              eventId: true,
              slug: true,
              ticketPrice: true,
              ticketPriceUsd: true,
              title: true,
            },
          })
        : Promise.resolve([]),
      grimoireSelection.eventId
        ? db.grimoireEvent.findMany({
            where: {
              id: grimoireSelection.eventId,
            },
            select: {
              id: true,
              subtitle: true,
              ticketLabel: true,
            },
          })
        : Promise.resolve([]),
    ]);

    payoutCandidates = buildDmPayoutCandidates({
      grimoireRows: buildGrimoireTicketSaleRows(
        [checkoutOrder as CheckoutOrderForAutomaticPayouts],
        curatedGames,
        events,
      ),
      leagueRows: [],
      paymentProfiles,
    });
  }

  for (const candidate of payoutCandidates) {
    const groupKey = `checkout-order:${checkoutOrder.id}:${candidate.dmLookupKey}`;
    const existingPayout = await db.ticketPayout.findFirst({
      where: {
        groupKey,
        saleSourceId: candidate.saleSourceId,
        saleSourceType: candidate.saleSourceType as TicketSaleSourceType,
      },
      select: {
        id: true,
      },
    });

    if (existingPayout) {
      continue;
    }

    const payoutRatePct =
      candidate.checkoutType === "LEAGUE"
        ? ticketSalesSettings.leagueGameDmPayoutRatePct
        : ticketSalesSettings.eventGameDmPayoutRatePct;

    await db.ticketPayout.create({
      data: {
        checkoutType: candidate.checkoutType,
        dmName: candidate.dmName,
        dmPaymentProfileId: candidate.dmPaymentProfileId,
        dmUserId: candidate.dmUserId,
        grossTicketSalesUsd: candidate.grossTicketSalesUsd,
        groupKey,
        payoutAmountUsd: calculatePayoutAmount(
          candidate.grossTicketSalesUsd,
          payoutRatePct,
        ),
        payoutRatePct,
        saleSourceId: candidate.saleSourceId,
        saleSourceLabel: candidate.saleSourceLabel,
        saleSourceType: candidate.saleSourceType as TicketSaleSourceType,
        seatCount: candidate.seatCount,
        status: "PENDING",
      },
    });
  }
}
