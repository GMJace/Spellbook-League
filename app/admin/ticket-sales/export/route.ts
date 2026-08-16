import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import {
  buildGrimoireTicketSaleRows,
  buildLeagueTicketSaleRows,
  buildMembershipSaleRows,
} from "@/lib/ticket-sales";

type ReportType =
  | "badges"
  | "grimoire"
  | "league"
  | "memberships"
  | "payouts"
  | "refunds"
  | "spellbook-expenses";

function escapeCsvValue(value: boolean | number | null | string | undefined) {
  const normalized = String(value ?? "");

  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildCsv(rows: Array<Array<boolean | number | null | string | undefined>>) {
  return rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
}

function getTicketSalesPrisma() {
  return prisma as typeof prisma & {
    spellbookExpenseReceipt?: {
      findMany?: (...args: any[]) => Promise<any[]>;
    };
    ticketPayout?: {
      findMany?: (...args: any[]) => Promise<any[]>;
    };
  };
}

async function ensureTicketSalesAccess() {
  const session = await auth();
  const isAllowed =
    Boolean(session?.user?.email && isAdminEmail(session.user.email)) ||
    Boolean(session?.user?.roles?.includes("EVENT_ADMIN"));

  if (!isAllowed) {
    return null;
  }

  return session;
}

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

async function buildLeagueSalesCsv() {
  const [completedOrders, games] = await Promise.all([
    prisma.checkoutOrder.findMany({
      where: {
        checkoutType: "LEAGUE",
        status: "COMPLETED",
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
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.game.findMany({
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
    }),
  ]);

  const rows = buildLeagueTicketSaleRows(completedOrders, games);

  return buildCsv([
    [
      "Captured At",
      "Created At",
      "Game ID",
      "Game Title",
      "Game Date",
      "DM",
      "Seats Sold",
      "Ticket Label",
      "Unit Price USD",
      "Gross Sales USD",
      "Payer Email",
      "Receipt Number",
      "PayPal Order ID",
      "Checkout Order ID",
    ],
    ...rows.map((row) => [
      row.capturedAt?.toISOString() ?? "",
      row.createdAt.toISOString(),
      row.gameId,
      row.title,
      row.gameDate?.toISOString() ?? "",
      row.dmName,
      row.quantity,
      row.ticketPriceLabel,
      row.unitPriceUsd,
      row.totalUsd,
      row.payerEmail ?? "",
      row.receiptNumber ?? "",
      row.paypalOrderId,
      row.checkoutOrderId,
    ]),
  ]);
}

async function buildGrimoireSalesCsv() {
  const [completedOrders, events, curatedGames] = await Promise.all([
    prisma.checkoutOrder.findMany({
      where: {
        checkoutType: "GRIMOIRE",
        status: "COMPLETED",
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
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.grimoireEvent.findMany({
      select: {
        id: true,
        subtitle: true,
        ticketLabel: true,
      },
    }),
    prisma.grimoireCuratedGame.findMany({
      select: {
        dm: true,
        eventId: true,
        slug: true,
        ticketPrice: true,
        ticketPriceUsd: true,
        title: true,
      },
    }),
  ]);

  const rows = buildGrimoireTicketSaleRows(completedOrders, curatedGames, events);

  return buildCsv([
    [
      "Captured At",
      "Created At",
      "Event ID",
      "Event Label",
      "Sale Source Type",
      "Sale Source ID",
      "Item Title",
      "DM",
      "Quantity",
      "Ticket Label",
      "Unit Price USD",
      "Gross Sales USD",
      "Payer Email",
      "Receipt Number",
      "PayPal Order ID",
      "Checkout Order ID",
    ],
    ...rows.map((row) => [
      row.capturedAt?.toISOString() ?? "",
      row.createdAt.toISOString(),
      row.eventId ?? "",
      row.eventLabel,
      row.saleSourceType,
      row.saleSourceId,
      row.title,
      row.dmName ?? "",
      row.quantity,
      row.ticketPriceLabel,
      row.unitPriceUsd,
      row.totalUsd,
      row.payerEmail ?? "",
      row.receiptNumber ?? "",
      row.paypalOrderId,
      row.checkoutOrderId,
    ]),
  ]);
}

async function buildBadgeSalesCsv() {
  const [completedOrders, events, curatedGames] = await Promise.all([
    prisma.checkoutOrder.findMany({
      where: {
        checkoutType: "GRIMOIRE",
        status: "COMPLETED",
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
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.grimoireEvent.findMany({
      select: {
        id: true,
        subtitle: true,
        ticketLabel: true,
      },
    }),
    prisma.grimoireCuratedGame.findMany({
      select: {
        dm: true,
        eventId: true,
        slug: true,
        ticketPrice: true,
        ticketPriceUsd: true,
        title: true,
      },
    }),
  ]);

  const rows = buildGrimoireTicketSaleRows(completedOrders, curatedGames, events).filter(
    (row) => row.saleSourceType === "GRIMOIRE_BADGE",
  );

  return buildCsv([
    [
      "Captured At",
      "Created At",
      "Event ID",
      "Event Label",
      "Badge Label",
      "Quantity",
      "Ticket Label",
      "Unit Price USD",
      "Gross Sales USD",
      "Payer Email",
      "Receipt Number",
      "PayPal Order ID",
      "Checkout Order ID",
    ],
    ...rows.map((row) => [
      row.capturedAt?.toISOString() ?? "",
      row.createdAt.toISOString(),
      row.eventId ?? "",
      row.eventLabel,
      row.title,
      row.quantity,
      row.ticketPriceLabel,
      row.unitPriceUsd,
      row.totalUsd,
      row.payerEmail ?? "",
      row.receiptNumber ?? "",
      row.paypalOrderId,
      row.checkoutOrderId,
    ]),
  ]);
}

async function buildMembershipSalesCsv() {
  const completedOrders = await prisma.checkoutOrder.findMany({
    where: {
      checkoutType: "LEAGUE",
      status: "COMPLETED",
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
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });

  const rows = buildMembershipSaleRows(completedOrders);

  return buildCsv([
    [
      "Captured At",
      "Created At",
      "Product Name",
      "Duration Days",
      "Quantity",
      "Unit Price USD",
      "Gross Sales USD",
      "Payer Email",
      "Receipt Number",
      "PayPal Order ID",
      "Checkout Order ID",
    ],
    ...rows.map((row) => [
      row.capturedAt?.toISOString() ?? "",
      row.createdAt.toISOString(),
      row.productName,
      row.durationDays,
      row.quantity,
      row.unitPriceUsd,
      row.totalUsd,
      row.payerEmail ?? "",
      row.receiptNumber ?? "",
      row.paypalOrderId,
      row.checkoutOrderId,
    ]),
  ]);
}

async function buildPayoutsCsv() {
  const ticketPayout = getTicketSalesPrisma().ticketPayout;

  if (!ticketPayout?.findMany) {
    return null;
  }

  const payouts = await ticketPayout.findMany({
    include: {
      createdBy: {
        select: {
          name: true,
        },
      },
      dmPaymentProfile: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return buildCsv([
    [
      "Created At",
      "Paid At",
      "Checkout Type",
      "Sale Source Type",
      "Sale Source ID",
      "Sale Source Label",
      "DM",
      "Seats Sold",
      "Gross Sales USD",
      "Payout Rate %",
      "Paid Payout Rate %",
      "Payout Amount USD",
      "Status",
      "Payment Method",
      "Payment Contact",
      "Notes",
      "Created By",
    ],
    ...payouts.map((payout) => [
      payout.createdAt?.toISOString?.() ?? "",
      payout.paidAt?.toISOString?.() ?? "",
      payout.checkoutType,
      payout.saleSourceType,
      payout.saleSourceId ?? "",
      payout.saleSourceLabel,
      payout.dmName,
      payout.seatCount,
      payout.grossTicketSalesUsd,
      payout.payoutRatePct,
      payout.paidPayoutRatePct ?? "",
      payout.payoutAmountUsd,
      payout.status,
      payout.dmPaymentProfile?.paymentMethodLabel ??
        payout.dmPaymentProfile?.paymentMethodType ??
        "",
      payout.dmPaymentProfile?.contactEmail ?? "",
      payout.notes ?? "",
      payout.createdBy?.name ?? "",
    ]),
  ]);
}

async function buildRefundsCsv() {
  const prismaTicketSales = getTicketSalesPrisma() as typeof prisma & {
    ticketRefund?: {
      findMany?: (...args: any[]) => Promise<any[]>;
    };
  };

  if (!prismaTicketSales.ticketRefund?.findMany) {
    return null;
  }

  const refunds = await prismaTicketSales.ticketRefund.findMany({
    include: {
      checkoutOrder: {
        select: {
          paypalOrderId: true,
          receiptNumber: true,
          summaryText: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ refundedAt: "desc" }, { createdAt: "desc" }],
  });

  return buildCsv([
    [
      "Refunded At",
      "Created At",
      "Checkout Type",
      "Sale Source Type",
      "Sale Source ID",
      "Sale Source Label",
      "Refund Amount USD",
      "Credit Given",
      "Credit Amount USD",
      "Reason",
      "Notes",
      "Refund Receipt Number",
      "Sale Receipt Number",
      "PayPal Order ID",
      "Order Summary",
      "Logged By",
    ],
    ...refunds.map((refund) => [
      refund.refundedAt?.toISOString?.() ?? "",
      refund.createdAt?.toISOString?.() ?? "",
      refund.checkoutType,
      refund.saleSourceType,
      refund.saleSourceId ?? "",
      refund.saleSourceLabel,
      refund.amountUsd,
      refund.creditGiven ? "Yes" : "No",
      refund.creditAmountUsd,
      refund.reason,
      refund.notes ?? "",
      refund.receiptNumber ?? "",
      refund.checkoutOrder?.receiptNumber ?? "",
      refund.checkoutOrder?.paypalOrderId ?? "",
      refund.checkoutOrder?.summaryText ?? "",
      refund.createdBy?.name ?? "",
    ]),
  ]);
}

async function buildSpellbookExpensesCsv() {
  const spellbookExpenseReceipt = getTicketSalesPrisma().spellbookExpenseReceipt;

  if (!spellbookExpenseReceipt?.findMany) {
    return null;
  }

  const receipts = await spellbookExpenseReceipt.findMany({
    include: {
      createdBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });

  return buildCsv([
    [
      "Date",
      "Card",
      "Company",
      "Service/Item",
      "Total USD",
      "Tax Paid USD",
      "Logged By",
      "Created At",
    ],
    ...receipts.map((receipt) => [
      receipt.expenseDate?.toISOString?.() ?? "",
      receipt.cardHolder,
      receipt.company,
      receipt.serviceItem,
      receipt.totalUsd,
      receipt.taxPaidUsd,
      receipt.createdBy?.name ?? "",
      receipt.createdAt?.toISOString?.() ?? "",
    ]),
  ]);
}

export async function GET(request: Request) {
  const session = await ensureTicketSalesAccess();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") as null | ReportType;
  const exportDate = new Date().toISOString().slice(0, 10);

  if (report === "league") {
    return csvResponse(
      await buildLeagueSalesCsv(),
      `ticket-sales-league-${exportDate}.csv`,
    );
  }

  if (report === "grimoire") {
    return csvResponse(
      await buildGrimoireSalesCsv(),
      `ticket-sales-grimoire-${exportDate}.csv`,
    );
  }

  if (report === "badges") {
    return csvResponse(
      await buildBadgeSalesCsv(),
      `ticket-sales-event-badges-${exportDate}.csv`,
    );
  }

  if (report === "memberships") {
    return csvResponse(
      await buildMembershipSalesCsv(),
      `ticket-sales-memberships-${exportDate}.csv`,
    );
  }

  if (report === "payouts") {
    const csv = await buildPayoutsCsv();

    if (!csv) {
      return new Response(
        "Ticket payout tracking is unavailable until the Prisma migration and client refresh are applied.",
        { status: 503 },
      );
    }

    return csvResponse(csv, `ticket-sales-payouts-${exportDate}.csv`);
  }

  if (report === "refunds") {
    const csv = await buildRefundsCsv();

    if (!csv) {
      return new Response(
        "Refund export is unavailable until the Prisma migration and client refresh are applied.",
        { status: 503 },
      );
    }

    return csvResponse(csv, `ticket-sales-refunds-${exportDate}.csv`);
  }

  if (report === "spellbook-expenses") {
    const csv = await buildSpellbookExpensesCsv();

    if (!csv) {
      return new Response(
        "SPELLBOOK purchase export is unavailable until the Prisma migration and client refresh are applied.",
        { status: 503 },
      );
    }

    return csvResponse(csv, `ticket-sales-spellbook-purchases-${exportDate}.csv`);
  }

  return new Response("Unknown report.", { status: 400 });
}
