import { PrismaClient } from "@prisma/client";

import { createRefundReceiptNumber, createSaleReceiptNumber } from "../lib/ticket-receipts";

const prisma = new PrismaClient();

async function main() {
  const [orders, refunds] = await Promise.all([
    prisma.checkoutOrder.findMany({
      where: {
        receiptNumber: null,
      },
      select: {
        createdAt: true,
        id: true,
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.ticketRefund.findMany({
      where: {
        receiptNumber: null,
      },
      select: {
        id: true,
        refundedAt: true,
      },
      orderBy: [{ refundedAt: "asc" }],
    }),
  ]);

  for (const order of orders) {
    await prisma.checkoutOrder.update({
      where: {
        id: order.id,
      },
      data: {
        receiptNumber: createSaleReceiptNumber(order.createdAt),
      },
    });
  }

  for (const refund of refunds) {
    await prisma.ticketRefund.update({
      where: {
        id: refund.id,
      },
      data: {
        receiptNumber: createRefundReceiptNumber(refund.refundedAt),
      },
    });
  }

  console.log(
    `Backfilled ${orders.length} checkout order receipt numbers and ${refunds.length} refund receipt numbers.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
