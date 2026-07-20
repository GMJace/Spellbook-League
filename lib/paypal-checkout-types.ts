export type LeaguePayPalCheckoutPayload = {
  checkoutType: "LEAGUE";
  items: Array<{
    characterId: string;
    gameId: string;
    quantity: number;
    guestEmails: string[];
  }>;
};

export type GrimoirePayPalCheckoutPayload = {
  checkoutType: "GRIMOIRE";
  badgeQuantity: number;
  badgeType: "REGULAR" | "FLYING_CARPET";
  isGiftPurchase: boolean;
  receiverEmails: string[];
  items: Array<{
    slug: string;
    quantity: number;
  }>;
};

export type PayPalCheckoutPayload =
  | LeaguePayPalCheckoutPayload
  | GrimoirePayPalCheckoutPayload;
