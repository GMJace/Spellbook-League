import { NextResponse } from "next/server";
import { z } from "zod";

import { paypalRequest } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

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

  const checkoutOrder = await prisma.checkoutOrder.findUnique({
    where: {
      paypalOrderId: parsed.data.orderId,
    },
  });

  if (!checkoutOrder) {
    return jsonError("That PayPal order could not be found.", 404);
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

    await prisma.checkoutOrder.update({
      where: {
        paypalOrderId: parsed.data.orderId,
      },
      data: {
        captureDataJson: JSON.stringify(capturedOrder),
        capturedAt: isCompleted ? new Date() : null,
        payerEmail,
        status: isCompleted ? "COMPLETED" : "FAILED",
      },
    });

    if (!isCompleted) {
      return jsonError("PayPal did not complete the payment capture.", 400);
    }

    return NextResponse.json({
      payerEmail,
      success: true,
    });
  } catch (error) {
    await prisma.checkoutOrder.update({
      where: {
        paypalOrderId: parsed.data.orderId,
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
