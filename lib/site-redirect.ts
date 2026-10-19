/** A relative Location keeps browser redirects on the public site behind a proxy. */
export function redirectWithinSite(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\r\n]/.test(path)) {
    throw new Error("Redirect destination must be a path within this site.");
  }
  return new Response(null, { status: 303, headers: { Location: path } });
}
