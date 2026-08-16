"use client";

import { useEffect, useRef, useState } from "react";

import type { PayPalCheckoutPayload } from "@/lib/paypal-checkout-types";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (error: unknown) => void;
        style?: {
          color?: "gold" | "blue" | "silver" | "white" | "black";
          label?: "paypal" | "checkout" | "buynow" | "pay";
          layout?: "vertical" | "horizontal";
          shape?: "rect" | "pill";
        };
      }) => {
        render: (selector: HTMLElement) => Promise<void>;
      };
    };
  }
}

let paypalScriptPromise: Promise<void> | null = null;

function loadPayPalScript(clientId: string) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.paypal?.Buttons) {
    return Promise.resolve();
  }

  if (paypalScriptPromise) {
    return paypalScriptPromise;
  }

  paypalScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("paypal-sdk-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load the PayPal SDK.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk-script";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load the PayPal SDK."));
    document.head.appendChild(script);
  });

  return paypalScriptPromise;
}

type PayPalCheckoutButtonProps = {
  clientId: null | string;
  disabled: boolean;
  disabledText: string;
  payableAmountUsd: number;
  payload: PayPalCheckoutPayload;
};

async function parseResponseError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "PayPal checkout failed.";
  } catch {
    return "PayPal checkout failed.";
  }
}

export function PayPalCheckoutButton({
  clientId,
  disabled,
  disabledText,
  payableAmountUsd,
  payload,
}: PayPalCheckoutButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<null | string>(null);

  async function cancelCreatedOrder(orderId: null | string) {
    if (!orderId) {
      return;
    }

    try {
      await fetch("/api/paypal/cancel-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
        }),
      });
    } catch {
      // Ignore local release errors here and let server-side expiry cleanup handle it.
    }
  }

  async function createOrderRequest() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseResponseError(response));
    }

    const data = (await response.json()) as
      | {
          completed: true;
          payerEmail?: null | string;
          storeCreditAppliedUsd?: number;
          success: true;
        }
      | {
          id: string;
        };

    if ("completed" in data && data.completed) {
      setSuccessMessage(
        data.payerEmail
          ? `Purchase completed with account credit. A receipt was sent to ${data.payerEmail}.`
          : "Purchase completed with account credit.",
      );
      setLastCreatedOrderId(null);
      return null;
    }

    if (!("id" in data)) {
      throw new Error("PayPal checkout did not return an order ID.");
    }

    setLastCreatedOrderId(data.id);
    return data.id;
  }

  useEffect(() => {
    let isActive = true;

    if (!clientId || payableAmountUsd <= 0) {
      return undefined;
    }

    void loadPayPalScript(clientId)
      .then(() => {
        if (isActive) {
          setSdkReady(true);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load the PayPal SDK.",
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [clientId, payableAmountUsd]);

  useEffect(() => {
    let isMounted = true;

    if (!sdkReady || !containerRef.current || disabled || !window.paypal?.Buttons) {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      return undefined;
    }

    containerRef.current.innerHTML = "";
    setErrorMessage(null);

    const buttons = window.paypal.Buttons({
      style: {
        color: "gold",
        label: "paypal",
        layout: "vertical",
        shape: "rect",
      },
      createOrder: async () => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const orderId = await createOrderRequest();

        if (!orderId) {
          throw new Error("This checkout was completed with account credit instead.");
        }

        return orderId;
      },
      onApprove: async (data) => {
        setIsCapturing(true);
        setErrorMessage(null);

        const response = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: data.orderID,
          }),
        });

        setIsCapturing(false);
        setLastCreatedOrderId(null);

        if (!response.ok) {
          throw new Error(await parseResponseError(response));
        }

        const result = (await response.json()) as {
          payerEmail?: string | null;
          success: boolean;
        };

        if (!isMounted) {
          return;
        }

        setSuccessMessage(
          result.payerEmail
            ? `Payment completed. A PayPal receipt was sent to ${result.payerEmail}.`
            : "Payment completed successfully.",
        );
      },
      onCancel: () => {
        void cancelCreatedOrder(lastCreatedOrderId);
        setLastCreatedOrderId(null);
        if (isMounted) {
          setErrorMessage("Checkout was canceled before payment completed.");
        }
      },
      onError: (error) => {
        void cancelCreatedOrder(lastCreatedOrderId);
        setLastCreatedOrderId(null);
        if (isMounted) {
          setIsCapturing(false);
          setErrorMessage(
            error instanceof Error ? error.message : "PayPal checkout failed.",
          );
        }
      },
    });

    void buttons.render(containerRef.current).catch((error: unknown) => {
      if (isMounted) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to render PayPal checkout.",
        );
      }
    });

    return () => {
      isMounted = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [disabled, lastCreatedOrderId, payload, sdkReady]);

  if (!clientId && payableAmountUsd > 0) {
    return (
      <span aria-disabled="true" className="button ggcon-button-disabled">
        PayPal checkout unavailable
      </span>
    );
  }

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {!disabled && payableAmountUsd <= 0 ? (
        <button
          disabled={isCreatingOrder}
          type="button"
          onClick={() => {
            setIsCreatingOrder(true);
            void createOrderRequest()
              .catch((error: unknown) => {
                setErrorMessage(
                  error instanceof Error ? error.message : "Unable to complete credit checkout.",
                );
              })
              .finally(() => {
                setIsCreatingOrder(false);
              });
          }}
        >
          {isCreatingOrder ? "Applying account credit..." : "Complete with account credit"}
        </button>
      ) : null}

      {disabled ? (
        <span aria-disabled="true" className="button ggcon-button-disabled">
          {disabledText}
        </span>
      ) : null}

      {!disabled && payableAmountUsd > 0 ? (
        <>
          {!sdkReady ? (
            <span aria-disabled="true" className="button ggcon-button-disabled">
              Loading PayPal
            </span>
          ) : null}
          <div ref={containerRef} style={{ minHeight: sdkReady ? "46px" : undefined }} />
        </>
      ) : null}

      {isCapturing ? (
        <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
          Finalizing your PayPal payment...
        </p>
      ) : null}
      {isCreatingOrder ? (
        <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
          Finalizing your account credit purchase...
        </p>
      ) : null}

      {successMessage ? (
        <p style={{ margin: 0 }}>{successMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="muted ggcon-meta-note league-cart-warning" style={{ margin: 0 }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
