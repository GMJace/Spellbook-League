export type LeaguePayPalCheckoutPayload = {
  checkoutType: "LEAGUE";
  items: Array<{
    gameId: string;
    quantity: number;
    guestEmails: string[];
  }>;
};

export type GrimoirePayPalCheckoutPayload = {
  checkoutType: "GRIMOIRE";
  badgeQuantity: number;
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
