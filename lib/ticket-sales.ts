import type {
  CheckoutOrder,
  CheckoutType,
  Game,
  GrimoireCuratedGame,
  GrimoireEvent,
} from "@prisma/client";

import type {
  SerializedLeagueCheckoutData,
  SerializedLeagueCheckoutItem,
} from "@/lib/paypal-checkout-types";
import { parseTicketPriceUsd } from "@/lib/utils";

export const TICKET_SALE_SOURCE_TYPES = [
  "LEAGUE_GAME",
  "GRIMOIRE_BADGE",
  "GRIMOIRE_GAME",
  "MEMBERSHIP",
  "OTHER",
] as const;

export const DM_PAYMENT_METHOD_TYPES = [
  "PAYPAL",
  "E_TRANSFER",
  "BANK_TRANSFER",
  "OTHER",
] as const;

export const TICKET_PAYOUT_STATUSES = ["PENDING", "PAID", "CANCELLED"] as const;

export type TicketSaleSourceTypeValue = (typeof TICKET_SALE_SOURCE_TYPES)[number];
export type DmPaymentMethodTypeValue = (typeof DM_PAYMENT_METHOD_TYPES)[number];
export type TicketPayoutStatusValue = (typeof TICKET_PAYOUT_STATUSES)[number];

export type DmPaymentProfileRecord = {
  contactEmail: null | string;
  dmName: string;
  dmUserId: null | string;
  id: string;
  isActive: boolean;
  lookupKey: string;
  notes: null | string;
  paymentDetails: null | string;
  paymentMethodLabel: null | string;
  paymentMethodType: null | string;
};

type LeagueCheckoutGameRow = {
  characterName: string | null;
  gameId: string;
  guestEmails: string[];
  quantity: number;
  ticketPrice: string;
  title: string;
};

type LeagueCheckoutMembershipRow = {
  durationDays: number;
  priceUsd: number;
  productName: string;
  quantity: number;
};

type GrimoireCheckoutGameRow = {
  quantity: number;
  slug: string;
  ticketPrice: string;
  title: string;
};

type GrimoireCheckoutData = {
  badgeLabel: string;
  badgeQuantity: number;
  badgeType: string;
  badgeUnitPriceUsd: number;
  eventId: string;
  eventLabel: string;
  games: GrimoireCheckoutGameRow[];
};

export type TicketSalesOrder = Pick<
  CheckoutOrder,
  | "id"
  | "amountUsd"
  | "checkoutType"
  | "createdAt"
  | "capturedAt"
  | "itemDataJson"
  | "payerEmail"
  | "paypalOrderId"
  | "receiptNumber"
  | "status"
  | "summaryText"
>;

export type LeagueTicketSaleRow = {
  capturedAt: Date | null;
  checkoutOrderId: string;
  createdAt: Date;
  dmName: string;
  dmUserId: string | null;
  gameDate: Date | null;
  gameId: string;
  paypalOrderId: string;
  receiptNumber: string | null;
  payerEmail: string | null;
  quantity: number;
  saleSourceId: string;
  saleSourceLabel: string;
  saleSourceType: "LEAGUE_GAME";
  ticketPriceLabel: string;
  title: string;
  totalUsd: number;
  unitPriceUsd: number;
};

export type GrimoireTicketSaleRow = {
  capturedAt: Date | null;
  checkoutOrderId: string;
  createdAt: Date;
  dmName: string | null;
  dmUserId: string | null;
  eventId: string | null;
  eventLabel: string;
  paypalOrderId: string;
  receiptNumber: string | null;
  payerEmail: string | null;
  quantity: number;
  saleSourceId: string;
  saleSourceLabel: string;
  saleSourceType: "GRIMOIRE_BADGE" | "GRIMOIRE_GAME";
  ticketPriceLabel: string;
  title: string;
  totalUsd: number;
  unitPriceUsd: number;
};

export type MembershipSaleRow = {
  capturedAt: Date | null;
  checkoutOrderId: string;
  createdAt: Date;
  durationDays: number;
  payerEmail: string | null;
  paypalOrderId: string;
  receiptNumber: string | null;
  productName: string;
  quantity: number;
  totalUsd: number;
  unitPriceUsd: number;
};

export type DmPayoutCandidate = {
  checkoutType: CheckoutType;
  dmLookupKey: string;
  dmName: string;
  dmPaymentProfileId: null | string;
  dmUserId: null | string;
  grossTicketSalesUsd: number;
  saleSourceId: string;
  saleSourceLabel: string;
  saleSourceType: TicketSaleSourceTypeValue;
  seatCount: number;
};

function normalizeLeagueCheckoutGames(
  serializedValue: string,
): {
  games: LeagueCheckoutGameRow[];
  membership: LeagueCheckoutMembershipRow | null;
} {
  try {
    const parsed = JSON.parse(serializedValue) as SerializedLeagueCheckoutData;

    if (Array.isArray(parsed)) {
      return {
        games: parsed.map(normalizeLegacyLeagueItem).filter(Boolean) as LeagueCheckoutGameRow[],
        membership: null,
      };
    }

    const games = Array.isArray(parsed?.games)
      ? parsed.games.map(normalizeLegacyLeagueItem).filter(Boolean)
      : [];
    const membership =
      parsed?.membership &&
      typeof parsed.membership === "object" &&
      typeof parsed.membership.durationDays === "number" &&
      typeof parsed.membership.priceUsd === "number" &&
      typeof parsed.membership.productName === "string" &&
      typeof parsed.membership.quantity === "number"
        ? parsed.membership
        : null;

    return {
      games: games as LeagueCheckoutGameRow[],
      membership,
    };
  } catch {
    return {
      games: [],
      membership: null,
    };
  }
}

function normalizeLegacyLeagueItem(
  value: SerializedLeagueCheckoutItem | null | undefined,
): LeagueCheckoutGameRow | null {
  if (!value || typeof value !== "object" || !value.gameId || !value.title) {
    return null;
  }

  return {
    characterName: value.characterName ?? null,
    gameId: value.gameId,
    guestEmails: Array.isArray(value.guestEmails)
      ? value.guestEmails.filter((entry): entry is string => typeof entry === "string")
      : [],
    quantity: typeof value.quantity === "number" && value.quantity > 0 ? value.quantity : 0,
    ticketPrice: value.ticketPrice ?? "Unknown",
    title: value.title,
  };
}

function normalizeGrimoireCheckoutData(serializedValue: string): GrimoireCheckoutData | null {
  try {
    const parsed = JSON.parse(serializedValue) as Partial<GrimoireCheckoutData>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      badgeLabel: typeof parsed.badgeLabel === "string" ? parsed.badgeLabel : "Badge",
      badgeQuantity:
        typeof parsed.badgeQuantity === "number" && parsed.badgeQuantity > 0
          ? parsed.badgeQuantity
          : 0,
      badgeType: typeof parsed.badgeType === "string" ? parsed.badgeType : "REGULAR",
      badgeUnitPriceUsd:
        typeof parsed.badgeUnitPriceUsd === "number" && parsed.badgeUnitPriceUsd > 0
          ? parsed.badgeUnitPriceUsd
          : 0,
      eventId: typeof parsed.eventId === "string" ? parsed.eventId : "",
      eventLabel: typeof parsed.eventLabel === "string" ? parsed.eventLabel : "Grimoire event",
      games: Array.isArray(parsed.games)
        ? parsed.games
            .map((game) => {
              if (
                !game ||
                typeof game !== "object" ||
                typeof game.slug !== "string" ||
                typeof game.title !== "string"
              ) {
                return null;
              }

              return {
                quantity:
                  typeof game.quantity === "number" && game.quantity > 0 ? game.quantity : 0,
                slug: game.slug,
                ticketPrice: typeof game.ticketPrice === "string" ? game.ticketPrice : "Unknown",
                title: game.title,
              };
            })
            .filter(Boolean) as GrimoireCheckoutGameRow[]
        : [],
    };
  } catch {
    return null;
  }
}

function buildProfileMap(profiles: DmPaymentProfileRecord[]) {
  return new Map(profiles.map((profile) => [profile.lookupKey, profile]));
}

export function createDmPaymentLookupKey({
  dmName,
  dmUserId,
}: {
  dmName: string;
  dmUserId?: null | string;
}) {
  if (dmUserId) {
    return `user:${dmUserId}`;
  }

  const normalizedName = dmName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `name:${normalizedName || "unknown-dm"}`;
}

export function calculatePayoutAmount(grossTicketSalesUsd: number, payoutRatePct: number) {
  const gross = Number.isFinite(grossTicketSalesUsd) ? grossTicketSalesUsd : 0;
  const rate = Number.isFinite(payoutRatePct) ? payoutRatePct : 0;

  return Math.round(gross * (rate / 100) * 100) / 100;
}

export function calculateTaxAmount(amountUsd: number, ratePct: number) {
  const amount = Number.isFinite(amountUsd) ? amountUsd : 0;
  const rate = Number.isFinite(ratePct) ? ratePct : 0;

  return Math.round(amount * (rate / 100) * 100) / 100;
}

export function buildLeagueTicketSaleRows(
  orders: TicketSalesOrder[],
  games: Array<
    Pick<Game, "datePlayed" | "dmId" | "dmName" | "id" | "ticketPrice" | "title"> & {
      dm: null | {
        name: string;
      };
    }
  >,
) {
  const gameMap = new Map(games.map((game) => [game.id, game]));
  const rows: LeagueTicketSaleRow[] = [];

  for (const order of orders) {
    if (order.checkoutType !== "LEAGUE" || order.status !== "COMPLETED") {
      continue;
    }

    const parsed = normalizeLeagueCheckoutGames(order.itemDataJson);

    for (const gameRow of parsed.games) {
      const game = gameMap.get(gameRow.gameId);
      const unitPriceUsd = parseTicketPriceUsd(gameRow.ticketPrice || game?.ticketPrice || "");
      const totalUsd = unitPriceUsd * gameRow.quantity;

      rows.push({
        capturedAt: order.capturedAt,
        checkoutOrderId: order.id,
        createdAt: order.createdAt,
        dmName: game?.dm?.name ?? game?.dmName ?? "Unknown DM",
        dmUserId: game?.dmId ?? null,
        gameDate: game?.datePlayed ?? null,
        gameId: gameRow.gameId,
        paypalOrderId: order.paypalOrderId,
        receiptNumber: order.receiptNumber,
        payerEmail: order.payerEmail,
        quantity: gameRow.quantity,
        saleSourceId: gameRow.gameId,
        saleSourceLabel: game?.title ?? gameRow.title,
        saleSourceType: "LEAGUE_GAME",
        ticketPriceLabel: gameRow.ticketPrice || game?.ticketPrice || "Unknown",
        title: game?.title ?? gameRow.title,
        totalUsd,
        unitPriceUsd,
      });
    }
  }

  return rows.sort(
    (left, right) =>
      (right.capturedAt ?? right.createdAt).getTime() - (left.capturedAt ?? left.createdAt).getTime(),
  );
}

export function buildGrimoireTicketSaleRows(
  orders: TicketSalesOrder[],
  curatedGames: Array<Pick<GrimoireCuratedGame, "dm" | "eventId" | "slug" | "ticketPrice" | "ticketPriceUsd" | "title">>,
  events: Array<Pick<GrimoireEvent, "id" | "subtitle" | "ticketLabel">>,
) {
  const curatedGameMap = new Map(curatedGames.map((game) => [game.slug, game]));
  const eventMap = new Map(events.map((event) => [event.id, event]));
  const rows: GrimoireTicketSaleRow[] = [];

  for (const order of orders) {
    if (order.checkoutType !== "GRIMOIRE" || order.status !== "COMPLETED") {
      continue;
    }

    const parsed = normalizeGrimoireCheckoutData(order.itemDataJson);

    if (!parsed) {
      continue;
    }

    const event = parsed.eventId ? eventMap.get(parsed.eventId) : null;
    const eventLabel = event?.subtitle ?? parsed.eventLabel;

    if (parsed.badgeQuantity > 0 && parsed.badgeUnitPriceUsd > 0) {
      rows.push({
        capturedAt: order.capturedAt,
        checkoutOrderId: order.id,
        createdAt: order.createdAt,
        dmName: null,
        dmUserId: null,
        eventId: parsed.eventId || null,
        eventLabel,
        paypalOrderId: order.paypalOrderId,
        receiptNumber: order.receiptNumber,
        payerEmail: order.payerEmail,
        quantity: parsed.badgeQuantity,
        saleSourceId: parsed.eventId || order.id,
        saleSourceLabel: parsed.badgeLabel,
        saleSourceType: "GRIMOIRE_BADGE",
        ticketPriceLabel: parsed.badgeLabel,
        title: parsed.badgeLabel,
        totalUsd: parsed.badgeQuantity * parsed.badgeUnitPriceUsd,
        unitPriceUsd: parsed.badgeUnitPriceUsd,
      });
    }

    for (const gameRow of parsed.games) {
      const curatedGame = curatedGameMap.get(gameRow.slug);
      const unitPriceUsd =
        curatedGame?.ticketPriceUsd ??
        parseTicketPriceUsd(gameRow.ticketPrice || curatedGame?.ticketPrice || "");

      rows.push({
        capturedAt: order.capturedAt,
        checkoutOrderId: order.id,
        createdAt: order.createdAt,
        dmName: curatedGame?.dm ?? null,
        dmUserId: null,
        eventId: curatedGame?.eventId ?? parsed.eventId ?? null,
        eventLabel,
        paypalOrderId: order.paypalOrderId,
        receiptNumber: order.receiptNumber,
        payerEmail: order.payerEmail,
        quantity: gameRow.quantity,
        saleSourceId: curatedGame?.slug ?? gameRow.slug,
        saleSourceLabel: curatedGame?.title ?? gameRow.title,
        saleSourceType: "GRIMOIRE_GAME",
        ticketPriceLabel: gameRow.ticketPrice || curatedGame?.ticketPrice || "Unknown",
        title: curatedGame?.title ?? gameRow.title,
        totalUsd: gameRow.quantity * unitPriceUsd,
        unitPriceUsd,
      });
    }
  }

  return rows.sort(
    (left, right) =>
      (right.capturedAt ?? right.createdAt).getTime() - (left.capturedAt ?? left.createdAt).getTime(),
  );
}

export function buildMembershipSaleRows(orders: TicketSalesOrder[]) {
  const rows: MembershipSaleRow[] = [];

  for (const order of orders) {
    if (order.checkoutType !== "LEAGUE" || order.status !== "COMPLETED") {
      continue;
    }

    const parsed = normalizeLeagueCheckoutGames(order.itemDataJson);
    const membership = parsed.membership;

    if (!membership || membership.quantity < 1 || membership.priceUsd <= 0) {
      continue;
    }

    rows.push({
      capturedAt: order.capturedAt,
      checkoutOrderId: order.id,
      createdAt: order.createdAt,
      durationDays: membership.durationDays,
      payerEmail: order.payerEmail,
      paypalOrderId: order.paypalOrderId,
      receiptNumber: order.receiptNumber,
      productName: membership.productName,
      quantity: membership.quantity,
      totalUsd: membership.quantity * membership.priceUsd,
      unitPriceUsd: membership.priceUsd,
    });
  }

  return rows.sort(
    (left, right) =>
      (right.capturedAt ?? right.createdAt).getTime() - (left.capturedAt ?? left.createdAt).getTime(),
  );
}

export function buildDmPayoutCandidates(args: {
  grimoireRows: GrimoireTicketSaleRow[];
  leagueRows: LeagueTicketSaleRow[];
  paymentProfiles: DmPaymentProfileRecord[];
}) {
  const profileMap = buildProfileMap(args.paymentProfiles);
  const groupedCandidates = new Map<string, DmPayoutCandidate>();

  const addCandidate = (candidate: Omit<DmPayoutCandidate, "dmPaymentProfileId" | "dmLookupKey">) => {
    const dmLookupKey = createDmPaymentLookupKey({
      dmName: candidate.dmName,
      dmUserId: candidate.dmUserId,
    });
    const profile = profileMap.get(dmLookupKey) ?? null;
    const candidateKey = [
      candidate.checkoutType,
      candidate.saleSourceType,
      candidate.saleSourceId,
      dmLookupKey,
    ].join(":");
    const existing = groupedCandidates.get(candidateKey);

    if (existing) {
      existing.grossTicketSalesUsd += candidate.grossTicketSalesUsd;
      existing.seatCount += candidate.seatCount;
      return;
    }

    groupedCandidates.set(candidateKey, {
      ...candidate,
      dmLookupKey,
      dmPaymentProfileId: profile?.id ?? null,
    });
  };

  for (const row of args.leagueRows) {
    addCandidate({
      checkoutType: "LEAGUE",
      dmName: row.dmName,
      dmUserId: row.dmUserId,
      grossTicketSalesUsd: row.totalUsd,
      saleSourceId: row.saleSourceId,
      saleSourceLabel: row.saleSourceLabel,
      saleSourceType: "LEAGUE_GAME",
      seatCount: row.quantity,
    });
  }

  for (const row of args.grimoireRows) {
    if (!row.dmName) {
      continue;
    }

    addCandidate({
      checkoutType: "GRIMOIRE",
      dmName: row.dmName,
      dmUserId: row.dmUserId,
      grossTicketSalesUsd: row.totalUsd,
      saleSourceId: row.saleSourceId,
      saleSourceLabel: row.saleSourceLabel,
      saleSourceType: row.saleSourceType,
      seatCount: row.quantity,
    });
  }

  return Array.from(groupedCandidates.values()).sort((left, right) =>
    left.dmName.localeCompare(right.dmName) ||
    left.saleSourceLabel.localeCompare(right.saleSourceLabel),
  );
}

export function buildKnownDmCandidates(args: {
  curatedGames: Array<Pick<GrimoireCuratedGame, "dm">>;
  games: Array<
    Pick<Game, "dmId" | "dmName"> & {
      dm: null | {
        email: string;
        name: string;
      };
    }
  >;
  paymentProfiles: DmPaymentProfileRecord[];
}) {
  const profileMap = buildProfileMap(args.paymentProfiles);
  const candidates = new Map<
    string,
    {
      contactEmail: null | string;
      dmName: string;
      dmUserId: null | string;
      lookupKey: string;
      profile: DmPaymentProfileRecord | null;
    }
  >();

  for (const game of args.games) {
    const dmName = game.dm?.name ?? game.dmName ?? "";

    if (!dmName) {
      continue;
    }

    const lookupKey = createDmPaymentLookupKey({
      dmName,
      dmUserId: game.dmId ?? null,
    });

    candidates.set(lookupKey, {
      contactEmail: game.dm?.email ?? null,
      dmName,
      dmUserId: game.dmId ?? null,
      lookupKey,
      profile: profileMap.get(lookupKey) ?? null,
    });
  }

  for (const game of args.curatedGames) {
    if (!game.dm?.trim()) {
      continue;
    }

    const lookupKey = createDmPaymentLookupKey({
      dmName: game.dm,
      dmUserId: null,
    });

    if (!candidates.has(lookupKey)) {
      candidates.set(lookupKey, {
        contactEmail: null,
        dmName: game.dm,
        dmUserId: null,
        lookupKey,
        profile: profileMap.get(lookupKey) ?? null,
      });
    }
  }

  return Array.from(candidates.values()).sort((left, right) =>
    left.dmName.localeCompare(right.dmName),
  );
}

export function sumAmounts(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
}
