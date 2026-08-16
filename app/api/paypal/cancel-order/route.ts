import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { releaseCheckoutOrderStoreCreditHold } from "@/lib/store-credit";

const cancelOrderSchema = z.object({
  orderId: z.string().trim().min(1),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid cancel payload.", 400);
  }

  const parsed = cancelOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError("A valid PayPal order ID is required.", 400);
  }

  const checkoutOrder = await prisma.checkoutOrder.findUnique({
    where: {
      paypalOrderId: parsed.data.orderId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!checkoutOrder) {
    return jsonError("That PayPal order could not be found.", 404);
  }

  if (checkoutOrder.status !== "CREATED") {
    return NextResponse.json({ success: true });
  }

  await releaseCheckoutOrderStoreCreditHold(prisma, checkoutOrder.id);

  return NextResponse.json({ success: true });
}
