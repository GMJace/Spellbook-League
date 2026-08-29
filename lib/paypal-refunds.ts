import { formatPayPalAmount, paypalRequest } from "@/lib/paypal";

type PayPalCaptureRecord = {
  amount?: {
    currency_code?: string;
    value?: string;
  };
  id?: string;
  status?: string;
};

type PayPalCapturedOrderResponse = {
  purchase_units?: Array<{
    payments?: {
      captures?: PayPalCaptureRecord[];
    };
  }>;
};

export type PayPalRefundResponse = {
  amount?: {
    currency_code?: string;
    value?: string;
  };
  create_time?: string;
  id?: string;
  status?: string;
  status_details?: {
    reason?: string;
  };
};

export function extractPayPalCaptureFromOrderData(captureDataJson: null | string | undefined) {
  if (!captureDataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(captureDataJson) as PayPalCapturedOrderResponse;
    const captures = parsed.purchase_units?.flatMap(
      (purchaseUnit) => purchaseUnit.payments?.captures ?? [],
    );
    const firstCapture = captures?.find((capture) => typeof capture?.id === "string");

    if (!firstCapture?.id) {
      return null;
    }

    return {
      captureId: firstCapture.id,
      currencyCode: firstCapture.amount?.currency_code ?? "USD",
      status: firstCapture.status ?? null,
    };
  } catch {
    return null;
  }
}

export async function refundPayPalCapture(args: {
  amountUsd: number;
  captureId: string;
  currencyCode?: string;
  noteToPayer?: string | null;
  requestId: string;
}) {
  const response = await paypalRequest<PayPalRefundResponse>(
    `/v2/payments/captures/${args.captureId}/refund`,
    {
      body: {
        amount: {
          currency_code: args.currencyCode ?? "USD",
          value: formatPayPalAmount(args.amountUsd),
        },
        ...(args.noteToPayer?.trim()
          ? {
              note_to_payer: args.noteToPayer.trim().slice(0, 255),
            }
          : {}),
      },
      headers: {
        "PayPal-Request-Id": args.requestId,
      },
      method: "POST",
    },
  );

  return response;
}
