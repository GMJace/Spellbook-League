const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal API credentials.");
  }

  return { clientId, clientSecret };
}

export function getPayPalClientId() {
  return process.env.PAYPAL_CLIENT_ID?.trim() ?? null;
}

async function generatePayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = "Unable to authenticate with PayPal.";

    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText) as {
          error?: string;
          error_description?: string;
          message?: string;
        };

        errorMessage =
          responseJson.error_description ??
          responseJson.message ??
          responseJson.error ??
          errorMessage;
      } catch {
        errorMessage = responseText;
      }
    }

    throw new Error(errorMessage);
  }

  const data = responseText ? (JSON.parse(responseText) as { access_token?: string }) : {};

  if (!data.access_token) {
    throw new Error("PayPal did not return an access token.");
  }

  return data.access_token;
}

type PayPalRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST";
};

export async function paypalRequest<TResponse>(
  path: string,
  options: PayPalRequestOptions = {},
) {
  const accessToken = await generatePayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}${path}`, {
    method: options.method ?? "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const responseText = await response.text();
  const responseJson = responseText ? (JSON.parse(responseText) as TResponse) : null;

  if (!response.ok) {
    const errorMessage =
      typeof responseJson === "object" &&
      responseJson !== null &&
      "message" in responseJson &&
      typeof responseJson.message === "string"
        ? responseJson.message
        : "PayPal request failed.";

    throw new Error(errorMessage);
  }

  return responseJson;
}

export function formatPayPalAmount(amountUsd: number) {
  return amountUsd.toFixed(2);
}
