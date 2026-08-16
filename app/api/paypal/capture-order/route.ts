import { NextResponse } from "next/server";
import { z } from "zod";

import { grantGrimoireGuildMembership } from "@/lib/grimoire-guild-membership";
import { paypalRequest } from "@/lib/paypal";
import type { SerializedLeagueCheckoutData } from "@/lib/paypal-checkout-types";
import { prisma } from "@/lib/prisma";
import { ensureAutomaticTicketPayoutsForCheckoutOrder } from "@/lib/ticket-payouts";
import { createSaleReceiptNumber } from "@/lib/ticket-receipts";
import {
  releaseCheckoutOrderStoreCreditHold,
  releaseExpiredStoreCreditReservations,
  roundUsdAmount,
} from "@/lib/store-credit";

const captureOrderSchema = z.object({
  orderId: z.string().trim().min(1),
});

type PayPalCaptureOrderResponse = {
  id: string;
  payer?: {
    email_address?: string;
  };
  payment_source?: {
    paypal?: {
      email_address?: string;
    };
  };
  status?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getLeagueCheckoutMembership(
  serializedValue: string,
): null | {
  durationDays: number;
  productName: string;
  quantity: number;
} {
  try {
    const parsed = JSON.parse(serializedValue) as SerializedLeagueCheckoutData;

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }

    const membership = parsed.membership;

    if (
      !membership ||
      typeof membership !== "object" ||
      typeof membership.durationDays !== "number" ||
      typeof membership.productName !== "string" ||
      typeof membership.quantity !== "number" ||
      membership.quantity < 1
    ) {
      return null;
    }

    return {
      durationDays: membership.durationDays,
      productName: membership.productName,
      quantity: membership.quantity,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid capture payload.", 400);
  }

  const parsed = captureOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError("A valid PayPal order ID is required.", 400);
  }

  await releaseExpiredStoreCreditReservations(prisma);

  const checkoutOrder = await prisma.checkoutOrder.findUnique({
    where: {
      paypalOrderId: parsed.data.orderId,
    },
  });

  if (!checkoutOrder) {
    return jsonError("That PayPal order could not be found.", 404);
  }

  if (checkoutOrder.status === "FAILED") {
    return jsonError("This checkout expired or was canceled. Start the purchase again.", 400);
  }

  if (checkoutOrder.status === "COMPLETED") {
    return NextResponse.json({
      payerEmail: checkoutOrder.payerEmail ?? null,
      success: true,
    });
  }

  try {
    const capturedOrder = await paypalRequest<PayPalCaptureOrderResponse>(
      `/v2/checkout/orders/${parsed.data.orderId}/capture`,
      {
        body: {},
      },
    );

    if (!capturedOrder) {
      throw new Error("PayPal did not return a capture response.");
    }

    const payerEmail =
      capturedOrder.payment_source?.paypal?.email_address ??
      capturedOrder.payer?.email_address ??
      null;
    const isCompleted = capturedOrder.status === "COMPLETED";
    const completedAt = isCompleted ? new Date() : null;

    await prisma.$transaction(async (tx) => {
      const currentCheckoutOrder = await tx.checkoutOrder.findUnique({
        where: {
          id: checkoutOrder.id,
        },
      });

      if (!currentCheckoutOrder) {
        throw new Error("That PayPal order could not be found.");
      }

      if (currentCheckoutOrder.status === "FAILED") {
        throw new Error("This checkout expired or was canceled. Start the purchase again.");
      }

      if (
        isCompleted &&
        currentCheckoutOrder.storeCreditAppliedUsd > 0 &&
        currentCheckoutOrder.userId
      ) {
        const user = await tx.user.findUnique({
          where: {
            id: currentCheckoutOrder.userId,
          },
          select: {
            storeCreditHeldUsd: true,
            storeCreditUsd: true,
          },
        });

        if (!user) {
          throw new Error("That account could not be found for store credit checkout.");
        }

        if (
          user.storeCreditUsd < currentCheckoutOrder.storeCreditAppliedUsd ||
          user.storeCreditHeldUsd < currentCheckoutOrder.storeCreditAppliedUsd
        ) {
          throw new Error("Your store credit changed. Start the purchase again.");
        }

        await tx.user.update({
          where: {
            id: currentCheckoutOrder.userId,
          },
          data: {
            storeCreditHeldUsd: roundUsdAmount(
              Math.max(
                user.storeCreditHeldUsd - currentCheckoutOrder.storeCreditAppliedUsd,
                0,
              ),
            ),
            storeCreditUsd: roundUsdAmount(
              user.storeCreditUsd - currentCheckoutOrder.storeCreditAppliedUsd,
            ),
          },
        });
      }

      if (
        !isCompleted &&
        currentCheckoutOrder.storeCreditAppliedUsd > 0 &&
        currentCheckoutOrder.userId
      ) {
        const user = await tx.user.findUnique({
          where: {
            id: currentCheckoutOrder.userId,
          },
          select: {
            storeCreditHeldUsd: true,
          },
        });

        if (user) {
          await tx.user.update({
            where: {
              id: currentCheckoutOrder.userId,
            },
            data: {
              storeCreditHeldUsd: roundUsdAmount(
                Math.max(
                  user.storeCreditHeldUsd - currentCheckoutOrder.storeCreditAppliedUsd,
                  0,
                ),
              ),
            },
          });
        }
      }

      await tx.checkoutOrder.update({
        where: {
          id: currentCheckoutOrder.id,
        },
        data: {
          captureDataJson: JSON.stringify(capturedOrder),
          capturedAt: completedAt,
          payerEmail,
          receiptNumber:
            currentCheckoutOrder.receiptNumber ??
            (completedAt ? createSaleReceiptNumber(completedAt) : null),
          status: isCompleted ? "COMPLETED" : "FAILED",
        },
      });
    });

    if (!isCompleted) {
      return jsonError("PayPal did not complete the payment capture.", 400);
    }

    const membership = getLeagueCheckoutMembership(checkoutOrder.itemDataJson);

    if (
      checkoutOrder.checkoutType === "LEAGUE" &&
      membership &&
      checkoutOrder.userId
    ) {
      try {
        await grantGrimoireGuildMembership({
          checkoutOrderId: checkoutOrder.id,
          durationDays: membership.durationDays,
          productName: membership.productName,
          userId: checkoutOrder.userId,
        });
      } catch (error) {
        console.error("Unable to grant Grimoire Guild membership after checkout.", error);
      }
    }

    try {
      await ensureAutomaticTicketPayoutsForCheckoutOrder(checkoutOrder.id);
    } catch (error) {
      console.error("Unable to create automatic ticket payouts after PayPal capture.", error);
    }

    return NextResponse.json({
      payerEmail,
      success: true,
    });
  } catch (error) {
    await releaseCheckoutOrderStoreCreditHold(prisma, checkoutOrder.id);

    await prisma.checkoutOrder.updateMany({
      where: {
        id: checkoutOrder.id,
        status: "CREATED",
      },
      data: {
        status: "FAILED",
      },
    });

    return jsonError(
      error instanceof Error ? error.message : "Unable to capture the PayPal payment.",
      400,
    );
  }
}
