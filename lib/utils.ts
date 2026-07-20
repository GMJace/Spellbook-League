type GameStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type Tier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTier(tier: Tier) {
  return tier.replace("_", " ").replace("TIER", "Tier");
}

export function getTierValue(tier: Tier) {
  switch (tier) {
    case "TIER_4":
      return 4;
    case "TIER_3":
      return 3;
    case "TIER_2":
      return 2;
    default:
      return 1;
  }
}

export function formatStatus(status: GameStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

export function splitBulletLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s*/, ""));
}

export function parseTicketPriceUsd(ticketPrice: string) {
  const normalized = ticketPrice.trim();

  if (!normalized || /^free$/i.test(normalized)) {
    return 0;
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);

  return Number.isFinite(amount) ? amount : 0;
}

export function isPaidTicketPrice(ticketPrice: string) {
  return parseTicketPriceUsd(ticketPrice) > 0;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatStarRating(rating: number) {
  const clampedRating = Math.max(1, Math.min(5, rating));
  const safeRating = Math.round(clampedRating);
  const displayRating = Number.isInteger(clampedRating)
    ? String(clampedRating)
    : clampedRating.toFixed(1);

  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)} (${displayRating}/5)`;
}
