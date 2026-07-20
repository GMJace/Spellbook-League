export type LeaguePayPalCheckoutPayload = {
  checkoutType: "LEAGUE";
  membershipQuantity: number;
  items: Array<{
    characterId: string;
    gameId: string;
    quantity: number;
    guestEmails: string[];
  }>;
};

export type SerializedLeagueCheckoutMembership = {
  durationDays: number;
  priceUsd: number;
  productName: string;
  quantity: number;
};

export type SerializedLeagueCheckoutItem = {
  characterId?: string;
  characterName?: string;
  gameId?: string;
  guestEmails?: string[];
  quantity?: number;
  ticketPrice?: string;
  title?: string;
};

export type SerializedLeagueCheckoutData =
  | SerializedLeagueCheckoutItem[]
  | {
      games: SerializedLeagueCheckoutItem[];
      membership: null | SerializedLeagueCheckoutMembership;
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
