export function buildCuratedGameSlug(title: string, gameId: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!base) return null;
  return `${base}-${gameId}`;
}
