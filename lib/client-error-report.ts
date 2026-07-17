type ClientErrorPayload = {
  digest?: string | null;
  message: string;
  path?: string;
  source: string;
  stack?: string | null;
};

export async function reportClientError(payload: ClientErrorPayload) {
  try {
    await fetch("/api/site-monitoring/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore client reporting failures and keep the fallback UI responsive.
  }
}
