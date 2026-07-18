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
  payload,
}: PayPalCheckoutButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!clientId) {
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
  }, [clientId]);

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

        const data = (await response.json()) as { id: string };
        return data.id;
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
        if (isMounted) {
          setErrorMessage("Checkout was canceled before payment completed.");
        }
      },
      onError: (error) => {
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
  }, [disabled, payload, sdkReady]);

  if (!clientId) {
    return (
      <span aria-disabled="true" className="button ggcon-button-disabled">
        PayPal checkout unavailable
      </span>
    );
  }

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {disabled ? (
        <span aria-disabled="true" className="button ggcon-button-disabled">
          {disabledText}
        </span>
      ) : null}

      {!disabled ? (
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
