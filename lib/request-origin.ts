/** Validate browser POST origins, including HTTPS terminated by a reverse proxy. */
export function isSameOriginRequest(request: Request, publicBaseUrl?: string) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestUrl = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? requestUrl.protocol.slice(0, -1);
  const host = request.headers.get("host") ?? requestUrl.host;
  // Use the request Host, not a client-supplied X-Forwarded-Host. The reverse proxy
  // must preserve Host and overwrite X-Forwarded-Proto, as documented for deployment.
  if (["http", "https"].includes(protocol) && origin === `${protocol}://${host}`) return true;
  if (publicBaseUrl) {
    try { return origin === new URL(publicBaseUrl).origin; } catch { return false; }
  }
  return false;
}
