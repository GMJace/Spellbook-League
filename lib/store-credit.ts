import type { PrismaClient } from "@prisma/client";

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type PrismaLike = PrismaClient | PrismaTransactionClient;

export const STORE_CREDIT_RESERVATION_MINUTES = 30;

export function roundUsdAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function getStoreCreditReservationCutoff(now = new Date()) {
  return new Date(now.getTime() - STORE_CREDIT_RESERVATION_MINUTES * 60 * 1000);
}

export async function getReservedStoreCreditUsd(
  prisma: PrismaLike,
  userId: string,
  options: {
    excludeCheckoutOrderId?: string;
    now?: Date;
  } = {},
) {
  const reservations = await prisma.checkoutOrder.findMany({
    where: {
      userId,
      status: "CREATED",
      storeCreditAppliedUsd: {
        gt: 0,
      },
      createdAt: {
        gte: getStoreCreditReservationCutoff(options.now),
      },
      ...(options.excludeCheckoutOrderId
        ? {
            id: {
              not: options.excludeCheckoutOrderId,
            },
          }
        : {}),
    },
    select: {
      storeCreditAppliedUsd: true,
    },
  });

  return roundUsdAmount(
    reservations.reduce((total, reservation) => total + reservation.storeCreditAppliedUsd, 0),
  );
}

export async function releaseExpiredStoreCreditReservations(prisma: PrismaLike, now = new Date()) {
  const expiredReservations = await prisma.checkoutOrder.findMany({
    where: {
      status: "CREATED",
      storeCreditAppliedUsd: {
        gt: 0,
      },
      createdAt: {
        lt: getStoreCreditReservationCutoff(now),
      },
    },
    select: {
      id: true,
      storeCreditAppliedUsd: true,
      userId: true,
    },
  });

  if (!expiredReservations.length) {
    return 0;
  }

  await (prisma as PrismaClient).$transaction(async (tx) => {
    const releasedByUserId = new Map<string, number>();

    for (const reservation of expiredReservations) {
      if (!reservation.userId) {
        continue;
      }

      releasedByUserId.set(
        reservation.userId,
        roundUsdAmount(
          (releasedByUserId.get(reservation.userId) ?? 0) + reservation.storeCreditAppliedUsd,
        ),
      );
    }

    for (const [userId, releasedAmountUsd] of releasedByUserId) {
      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          storeCreditHeldUsd: true,
        },
      });

      if (!user) {
        continue;
      }

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          storeCreditHeldUsd: roundUsdAmount(
            Math.max(user.storeCreditHeldUsd - releasedAmountUsd, 0),
          ),
        },
      });
    }

    await tx.checkoutOrder.updateMany({
      where: {
        id: {
          in: expiredReservations.map((reservation) => reservation.id),
        },
      },
      data: {
        status: "FAILED",
      },
    });
  });

  return expiredReservations.length;
}

export async function releaseCheckoutOrderStoreCreditHold(
  prisma: PrismaLike,
  checkoutOrderId: string,
) {
  const checkoutOrder = await prisma.checkoutOrder.findUnique({
    where: {
      id: checkoutOrderId,
    },
    select: {
      id: true,
      status: true,
      storeCreditAppliedUsd: true,
      userId: true,
    },
  });

  if (
    !checkoutOrder ||
    checkoutOrder.status !== "CREATED" ||
    !checkoutOrder.userId ||
    checkoutOrder.storeCreditAppliedUsd <= 0
  ) {
    return false;
  }

  await (prisma as PrismaClient).$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: checkoutOrder.userId!,
      },
      select: {
        storeCreditHeldUsd: true,
      },
    });

    if (user) {
      await tx.user.update({
        where: {
          id: checkoutOrder.userId!,
        },
        data: {
          storeCreditHeldUsd: roundUsdAmount(
            Math.max(user.storeCreditHeldUsd - checkoutOrder.storeCreditAppliedUsd, 0),
          ),
        },
      });
    }

    await tx.checkoutOrder.update({
      where: {
        id: checkoutOrder.id,
      },
      data: {
        status: "FAILED",
      },
    });
  });

  return true;
}
