"use server";

import { CheckoutType, TicketSaleSourceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminUser, requireTicketSalesAdminUser } from "@/lib/admin";
import {
  buildStoredGameRewardStrings,
  hasStructuredGameRewardSelectionFields,
  readGameRewardSelectionsFromFormData,
} from "@/lib/game-reward-selections";
import { convertImageFileToDataUrl } from "@/lib/image-data-url";
import {
  calculatePayoutAmount,
  DM_PAYMENT_METHOD_TYPES,
  TICKET_PAYOUT_STATUSES,
  TICKET_SALE_SOURCE_TYPES,
} from "@/lib/ticket-sales";
import { createRefundReceiptNumber } from "@/lib/ticket-receipts";
import { prisma } from "@/lib/prisma";
import { spendTidingsForGame } from "@/lib/tidings";
import { isPaidTicketPrice } from "@/lib/utils";
import { gameParticipantsSchema, gameSchema } from "@/lib/validation";

const ticketSalesPath = "/admin/accounting";
const grimTidingsPath = "/admin/grimtidings";
const MAX_ADVENTURE_IMAGE_SIZE = 5 * 1024 * 1024;

const settingsSchema = z.object({
  eventGameDmPayoutRatePct: z.coerce.number().min(0).max(100),
  federalTaxRatePct: z.coerce.number().min(0).max(100),
  leagueGameDmPayoutRatePct: z.coerce.number().min(0).max(100),
  provincialTaxRatePct: z.coerce.number().min(0).max(100),
});

const paymentMethodEnum = z.enum(DM_PAYMENT_METHOD_TYPES);
const ticketSaleSourceTypeEnum = z.enum(TICKET_SALE_SOURCE_TYPES);
const ticketPayoutStatusEnum = z.enum(TICKET_PAYOUT_STATUSES);

function getTicketSalesPrisma() {
  return prisma as typeof prisma & {
    dmPaymentProfile?: {
      findUnique?: (...args: any[]) => Promise<any>;
      upsert?: (...args: any[]) => Promise<any>;
    };
    ticketPayout?: {
      create?: (...args: any[]) => Promise<any>;
      findUnique?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
    };
    ticketRefund?: {
      create?: (...args: any[]) => Promise<any>;
    };
    spellbookExpenseReceipt?: {
      create?: (...args: any[]) => Promise<any>;
    };
    ticketSalesSettings?: {
      upsert?: (...args: any[]) => Promise<any>;
    };
  };
}

async function saveAdventureImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return { error: "Adventure art must be an image file." } as const;
  }

  if (file.size > MAX_ADVENTURE_IMAGE_SIZE) {
    return { error: "Adventure art must be 5 MB or smaller." } as const;
  }

  return { path: await convertImageFileToDataUrl(file) } as const;
}

async function parseAdminGrimTidingsGameForm(formData: FormData) {
  const rewardStrings = hasStructuredGameRewardSelectionFields(formData)
    ? buildStoredGameRewardStrings(readGameRewardSelectionsFromFormData(formData))
    : {
        magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
        consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
      };
  const participantsRaw = String(formData.get("participants") ?? "[]");
  let parsedParticipantsSource: unknown = [];

  try {
    parsedParticipantsSource = JSON.parse(participantsRaw);
  } catch {
    return { error: "Please complete all required game fields." } as const;
  }

  const participantsResult = gameParticipantsSchema.safeParse(parsedParticipantsSource);

  if (!participantsResult.success) {
    return { error: "Please complete all required game fields." } as const;
  }

  const parsed = gameSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    adventureCode: String(formData.get("adventureCode") ?? ""),
    source: String(formData.get("source") ?? ""),
    gameSummary: String(formData.get("gameSummary") ?? ""),
    ticketPrice: "Free",
    isGrimTidings: true,
    grimTidingCost: String(formData.get("grimTidingCost") ?? "1"),
    datePlayed: String(formData.get("datePlayed") ?? ""),
    duration: String(formData.get("duration") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    seatCapacity: String(formData.get("seatCapacity") ?? "6"),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    downtimeDaysAwarded: String(formData.get("downtimeDaysAwarded") ?? "0"),
    rewardsSummary: String(formData.get("rewardsSummary") ?? ""),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    spellbookAwarded: String(formData.get("spellbookAwarded") ?? ""),
    sessionNotes: String(formData.get("sessionNotes") ?? ""),
    status: String(formData.get("status") ?? "SCHEDULED"),
    participants: participantsResult.data,
  });

  if (!parsed.success) {
    return { error: "Please complete all required game fields." } as const;
  }

  if (!parsed.data.isGrimTidings || isPaidTicketPrice(parsed.data.ticketPrice)) {
    return {
      error: "Grim Tidings games must use the Free price option.",
    } as const;
  }

  const seenCharacterIds = new Set<string>();

  for (const participant of parsed.data.participants) {
    if (participant.characterId && seenCharacterIds.has(participant.characterId)) {
      return { error: "A character cannot be added to the same game twice." } as const;
    }

    if (participant.characterId) {
      seenCharacterIds.add(participant.characterId);
    }
  }

  const players = await prisma.user.findMany({
    where: {
      id: { in: parsed.data.participants.map((participant) => participant.userId) },
    },
    include: {
      roles: true,
      characters: true,
    },
  });

  const playerMap = new Map(players.map((player) => [player.id, player]));

  for (const participant of parsed.data.participants) {
    const selectedUser = playerMap.get(participant.userId);
    const hasRole = selectedUser?.roles.some((role) => role.role === "PLAYER");
    const ownsCharacter = participant.characterId
      ? selectedUser?.characters.some((character) => character.id === participant.characterId)
      : true;

    if (!selectedUser || !hasRole || !ownsCharacter) {
      return { error: "One or more selected participants are invalid." } as const;
    }
  }

  return { data: parsed.data } as const;
}

function requireTicketSalesDelegate<TDelegate>(
  delegate: TDelegate,
  section: "payment" | "payout" | "refund" | "settings" | "spellbook-expense",
): Exclude<TDelegate, undefined> {
  if (!delegate) {
    redirectToTicketSales(section, "unavailable");
  }

  return delegate as Exclude<TDelegate, undefined>;
}

const paymentProfileSchema = z.object({
  contactEmail: z.string().trim().email().or(z.literal("")).transform((value) => value || null),
  dmName: z.string().trim().min(1).max(120),
  dmUserId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  isActive: z.boolean().default(true),
  lookupKey: z.string().trim().min(1).max(191),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  paymentDetails: z.string().trim().max(500).or(z.literal("")).transform((value) => value || null),
  paymentMethodLabel: z.string().trim().max(160).or(z.literal("")).transform((value) => value || null),
  paymentMethodType: paymentMethodEnum
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value)),
});

const refundSchema = z.object({
  amountUsd: z.coerce.number().positive(),
  checkoutOrderId: z.string().trim().min(1).max(191),
  creditAmountUsd: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  reason: z.string().trim().min(2).max(240),
  refundedAt: z.string().trim().or(z.literal("")),
});

const spellbookExpenseCardHolderEnum = z.enum(["Jace", "Trevor"]);

const spellbookExpenseReceiptSchema = z.object({
  cardHolder: spellbookExpenseCardHolderEnum,
  company: z.string().trim().min(1).max(160),
  expenseDate: z.string().trim().min(1),
  serviceItem: z.string().trim().min(1).max(240),
  taxPaidUsd: z.coerce.number().nonnegative(),
  totalUsd: z.coerce.number().nonnegative(),
});

function buildRefundSourceDetailsFromOrder(order: {
  checkoutType: CheckoutType;
  id: string;
  itemDataJson: string;
  summaryText: string;
}) {
  const fallbackLabel =
    order.summaryText || (order.checkoutType === "LEAGUE" ? "League sale" : "Grimoire sale");
  const fallbackSource = {
    checkoutType: order.checkoutType,
    saleSourceId: order.id,
    saleSourceLabel: fallbackLabel,
    saleSourceType: "OTHER" as TicketSaleSourceType,
  };

  try {
    const parsed = JSON.parse(order.itemDataJson) as
      | Array<{ title?: string }>
      | {
          badgeLabel?: string;
          badgeQuantity?: number;
          games?: Array<{ title?: string }>;
          membership?: {
            productName?: string;
            quantity?: number;
          } | null;
        };

    if (order.checkoutType === "LEAGUE") {
      if (Array.isArray(parsed)) {
        const firstGameTitle =
          parsed.find((entry) => typeof entry?.title === "string")?.title ?? fallbackLabel;

        return {
          checkoutType: order.checkoutType,
          saleSourceId: order.id,
          saleSourceLabel: firstGameTitle,
          saleSourceType: "LEAGUE_GAME" as TicketSaleSourceType,
        };
      }

      const games = Array.isArray(parsed?.games) ? parsed.games : [];
      const membership = parsed?.membership;

      if (
        membership &&
        typeof membership.productName === "string" &&
        typeof membership.quantity === "number" &&
        membership.quantity > 0 &&
        games.length === 0
      ) {
        return {
          checkoutType: order.checkoutType,
          saleSourceId: order.id,
          saleSourceLabel: membership.productName,
          saleSourceType: "MEMBERSHIP" as TicketSaleSourceType,
        };
      }

      if (games.length > 0) {
        return {
          checkoutType: order.checkoutType,
          saleSourceId: order.id,
          saleSourceLabel: fallbackLabel,
          saleSourceType: "LEAGUE_GAME" as TicketSaleSourceType,
        };
      }

      return fallbackSource;
    }

    if (!Array.isArray(parsed)) {
      const games = Array.isArray(parsed?.games) ? parsed.games : [];
      const badgeQuantity =
        typeof parsed?.badgeQuantity === "number" ? parsed.badgeQuantity : 0;
      const badgeLabel =
        typeof parsed?.badgeLabel === "string" && parsed.badgeLabel.trim()
          ? parsed.badgeLabel
          : fallbackLabel;

      if (badgeQuantity > 0 && games.length === 0) {
        return {
          checkoutType: order.checkoutType,
          saleSourceId: order.id,
          saleSourceLabel: badgeLabel,
          saleSourceType: "GRIMOIRE_BADGE" as TicketSaleSourceType,
        };
      }

      if (games.length > 0 && badgeQuantity === 0) {
        return {
          checkoutType: order.checkoutType,
          saleSourceId: order.id,
          saleSourceLabel: fallbackLabel,
          saleSourceType: "GRIMOIRE_GAME" as TicketSaleSourceType,
        };
      }
    }
  } catch {
    return fallbackSource;
  }

  return fallbackSource;
}

const payoutCreateSchema = z.object({
  checkoutType: z.nativeEnum(CheckoutType),
  dmName: z.string().trim().min(1).max(120),
  dmPaymentProfileId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  dmUserId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  grossTicketSalesUsd: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  payoutRatePct: z.coerce.number().min(0).max(100),
  saleSourceId: z.string().trim().max(191).or(z.literal("")).transform((value) => value || null),
  saleSourceLabel: z.string().trim().min(1).max(240),
  saleSourceType: ticketSaleSourceTypeEnum,
  seatCount: z.coerce.number().int().min(0).max(999),
});
const pendingDmPayoutCreateSchema = z.object({
  candidatesJson: z.string().trim().min(2),
});
const payoutUpdateSchema = z.object({
  dmPaymentProfileId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  grossTicketSalesUsd: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  payoutId: z.string().trim().min(1).max(191),
  payoutRatePct: z.coerce.number().min(0).max(100),
  status: ticketPayoutStatusEnum,
});
const payoutGroupUpdateSchema = z.object({
  dmPaymentProfileId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  eventTicketSalesUsd: z.coerce.number().nonnegative(),
  groupKeyOrPayoutId: z.string().trim().min(1).max(191),
  isGrouped: z.boolean().default(false),
  leagueTicketSalesUsd: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  status: ticketPayoutStatusEnum,
});

function redirectToTicketSales(
  section: "payment" | "payout" | "refund" | "settings" | "spellbook-expense" | "tidings",
  status: string,
): never {
  const params = new URLSearchParams();
  params.set(section, status);
  redirect(`${ticketSalesPath}?${params.toString()}`);
}

export async function createAdminGrimTidingsGame(formData: FormData) {
  const currentUser = await requireAdminUser();
  const parsed = await parseAdminGrimTidingsGameForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const adventureImageFile = formData.get("adventureImage");
  const reuseAdventureImagePath = String(formData.get("reuseAdventureImagePath") ?? "").trim();
  let adventureImagePath: null | string = reuseAdventureImagePath || null;

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return {
        error: uploadResult.error,
        fieldErrors: {
          adventureImage: uploadResult.error,
        },
      };
    }

    adventureImagePath = uploadResult.path;
  }

  const participantLogData = {
    approvedAt: null,
    logConsumablesAwarded: null,
    logMagicItemsAwarded: null,
    logRewardsSummary: null,
    logSessionNotes: null,
    logSpellbookAwarded: null,
    logStatus: "APPROVED" as const,
  };

  try {
    const createdGame = await prisma.$transaction(async (tx) => {
      const game = await tx.game.create({
        data: {
          dmId: null,
          loggedByUserId: currentUser.id,
          dmName: "SPELLBOOK DM",
          title: parsed.data.title,
          adventureCode: parsed.data.adventureCode,
          source: parsed.data.source,
          gameSummary: parsed.data.gameSummary,
          ticketPrice: "Free",
          isGrimTidings: true,
          grimTidingCost: parsed.data.grimTidingCost,
          ticketAccessCodeHash: null,
          adventureImagePath,
          datePlayed: new Date(parsed.data.datePlayed),
          duration: parsed.data.duration,
          tier: parsed.data.tier,
          seatCapacity: parsed.data.seatCapacity,
          serviceHours: parsed.data.serviceHours,
          downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
          rewardsSummary: parsed.data.rewardsSummary,
          magicItemsAwarded: parsed.data.magicItemsAwarded,
          consumablesAwarded: parsed.data.consumablesAwarded,
          spellbookAwarded: parsed.data.spellbookAwarded,
          consequencesSummary: "",
          sessionNotes: parsed.data.sessionNotes,
          status: parsed.data.status,
        },
      });

      for (const participant of parsed.data.participants) {
        await spendTidingsForGame(tx, {
          amount: Math.max(parsed.data.grimTidingCost, 1),
          gameId: game.id,
          reason: "Admin Grim Tidings seat assignment",
          sourceLabel: `${game.title} (${game.adventureCode})`,
          userId: participant.userId,
        });
      }

      if (parsed.data.participants.length) {
        await tx.gameParticipant.createMany({
          data: parsed.data.participants.map((participant) => ({
            gameId: game.id,
            characterId: participant.characterId,
            userId: participant.userId,
            ...participantLogData,
          })),
        });
      }

      return game;
    });

    revalidatePath(grimTidingsPath);
    revalidatePath("/admin/league-games");
    revalidatePath("/league");
    revalidatePath("/league/cart");
    revalidatePath(`/league/games/${createdGame.id}`);
    revalidatePath("/");

    redirect(`${grimTidingsPath}?tidings=created`);
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_TIDINGS") {
      return {
        error: "One or more selected players do not have enough Tidings for this game.",
      };
    }

    throw error;
  }
}

function parseOptionalDate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRequiredDateInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function saveTicketSalesSettings(formData: FormData) {
  const currentUser = await requireTicketSalesAdminUser();
  const parsed = settingsSchema.safeParse({
    eventGameDmPayoutRatePct: formData.get("eventGameDmPayoutRatePct"),
    federalTaxRatePct: formData.get("federalTaxRatePct"),
    leagueGameDmPayoutRatePct: formData.get("leagueGameDmPayoutRatePct"),
    provincialTaxRatePct: formData.get("provincialTaxRatePct"),
  });

  if (!parsed.success) {
    redirectToTicketSales("settings", "invalid");
  }

  const ticketSalesSettings = requireTicketSalesDelegate(
    getTicketSalesPrisma().ticketSalesSettings,
    "settings",
  );

  await ticketSalesSettings.upsert?.({
    where: {
      id: "default",
    },
    update: {
      eventGameDmPayoutRatePct: parsed.data.eventGameDmPayoutRatePct,
      federalTaxRatePct: parsed.data.federalTaxRatePct,
      leagueGameDmPayoutRatePct: parsed.data.leagueGameDmPayoutRatePct,
      provincialTaxRatePct: parsed.data.provincialTaxRatePct,
      updatedByUserId: currentUser.id,
    },
    create: {
      eventGameDmPayoutRatePct: parsed.data.eventGameDmPayoutRatePct,
      federalTaxRatePct: parsed.data.federalTaxRatePct,
      id: "default",
      leagueGameDmPayoutRatePct: parsed.data.leagueGameDmPayoutRatePct,
      provincialTaxRatePct: parsed.data.provincialTaxRatePct,
      updatedByUserId: currentUser.id,
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("settings", "updated");
}

export async function saveDmPaymentProfile(formData: FormData) {
  await requireTicketSalesAdminUser();
  const parsed = paymentProfileSchema.safeParse({
    contactEmail: formData.get("contactEmail"),
    dmName: formData.get("dmName"),
    dmUserId: formData.get("dmUserId"),
    isActive: formData.get("isActive") === "on",
    lookupKey: formData.get("lookupKey"),
    notes: formData.get("notes"),
    paymentDetails: formData.get("paymentDetails"),
    paymentMethodLabel: formData.get("paymentMethodLabel"),
    paymentMethodType: formData.get("paymentMethodType"),
  });

  if (!parsed.success) {
    redirectToTicketSales("payment", "invalid");
  }

  const dmPaymentProfile = requireTicketSalesDelegate(
    getTicketSalesPrisma().dmPaymentProfile,
    "payment",
  );

  await dmPaymentProfile.upsert?.({
    where: {
      lookupKey: parsed.data.lookupKey,
    },
    update: {
      contactEmail: parsed.data.contactEmail,
      dmName: parsed.data.dmName,
      dmUserId: parsed.data.dmUserId,
      isActive: parsed.data.isActive,
      notes: parsed.data.notes,
      paymentDetails: parsed.data.paymentDetails,
      paymentMethodLabel: parsed.data.paymentMethodLabel,
      paymentMethodType: parsed.data.paymentMethodType,
    },
    create: {
      contactEmail: parsed.data.contactEmail,
      dmName: parsed.data.dmName,
      dmUserId: parsed.data.dmUserId,
      isActive: parsed.data.isActive,
      lookupKey: parsed.data.lookupKey,
      notes: parsed.data.notes,
      paymentDetails: parsed.data.paymentDetails,
      paymentMethodLabel: parsed.data.paymentMethodLabel,
      paymentMethodType: parsed.data.paymentMethodType,
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("payment", "saved");
}

export async function createTicketRefund(formData: FormData) {
  const currentUser = await requireTicketSalesAdminUser();
  const parsed = refundSchema.safeParse({
    amountUsd: formData.get("amountUsd"),
    checkoutOrderId: formData.get("checkoutOrderId"),
    creditAmountUsd: formData.get("creditAmountUsd"),
    notes: formData.get("notes"),
    reason: formData.get("reason"),
    refundedAt: formData.get("refundedAt"),
  });

  if (!parsed.success) {
    redirectToTicketSales("refund", "invalid");
  }

  const refundedAt = parseOptionalDate(parsed.data.refundedAt);

  if (parsed.data.refundedAt && !refundedAt) {
    redirectToTicketSales("refund", "invalid");
  }

  const effectiveRefundedAt = refundedAt ?? new Date();
  const effectiveCreditAmountUsd = parsed.data.creditAmountUsd;
  const creditGiven = effectiveCreditAmountUsd > 0;

  if (effectiveCreditAmountUsd > parsed.data.amountUsd) {
    redirectToTicketSales("refund", "invalid");
  }

  const checkoutOrder = await prisma.checkoutOrder.findUnique({
    where: {
      id: parsed.data.checkoutOrderId,
    },
    select: {
      checkoutType: true,
      id: true,
      itemDataJson: true,
      summaryText: true,
    },
  });

  if (!checkoutOrder) {
    redirectToTicketSales("refund", "invalid");
  }

  const refundSource = buildRefundSourceDetailsFromOrder(checkoutOrder);

  const ticketRefund = requireTicketSalesDelegate(
    getTicketSalesPrisma().ticketRefund,
    "refund",
  );

  await ticketRefund.create?.({
    data: {
      amountUsd: parsed.data.amountUsd,
      checkoutOrderId: parsed.data.checkoutOrderId,
      checkoutType: refundSource.checkoutType,
      creditAmountUsd: effectiveCreditAmountUsd,
      creditGiven,
      createdByUserId: currentUser.id,
      notes: parsed.data.notes,
      receiptNumber: createRefundReceiptNumber(effectiveRefundedAt),
      reason: parsed.data.reason,
      refundedAt: effectiveRefundedAt,
      saleSourceId: refundSource.saleSourceId,
      saleSourceLabel: refundSource.saleSourceLabel,
      saleSourceType: refundSource.saleSourceType,
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("refund", "created");
}

export async function createSpellbookExpenseReceipt(formData: FormData) {
  const currentUser = await requireTicketSalesAdminUser();
  const parsed = spellbookExpenseReceiptSchema.safeParse({
    cardHolder: formData.get("cardHolder"),
    company: formData.get("company"),
    expenseDate: formData.get("expenseDate"),
    serviceItem: formData.get("serviceItem"),
    taxPaidUsd: formData.get("taxPaidUsd"),
    totalUsd: formData.get("totalUsd"),
  });

  if (!parsed.success) {
    redirectToTicketSales("spellbook-expense", "invalid");
  }

  const expenseDate = parseRequiredDateInput(parsed.data.expenseDate);

  if (!expenseDate || parsed.data.taxPaidUsd > parsed.data.totalUsd) {
    redirectToTicketSales("spellbook-expense", "invalid");
  }

  const spellbookExpenseReceipt = requireTicketSalesDelegate(
    getTicketSalesPrisma().spellbookExpenseReceipt,
    "spellbook-expense",
  );

  await spellbookExpenseReceipt.create?.({
    data: {
      cardHolder: parsed.data.cardHolder,
      company: parsed.data.company,
      createdByUserId: currentUser.id,
      expenseDate,
      serviceItem: parsed.data.serviceItem,
      taxPaidUsd: parsed.data.taxPaidUsd,
      totalUsd: parsed.data.totalUsd,
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("spellbook-expense", "created");
}

export async function createTicketPayout(formData: FormData) {
  const currentUser = await requireTicketSalesAdminUser();
  const parsed = payoutCreateSchema.safeParse({
    checkoutType: formData.get("checkoutType"),
    dmName: formData.get("dmName"),
    dmPaymentProfileId: formData.get("dmPaymentProfileId"),
    dmUserId: formData.get("dmUserId"),
    grossTicketSalesUsd: formData.get("grossTicketSalesUsd"),
    notes: formData.get("notes"),
    payoutRatePct: formData.get("payoutRatePct"),
    saleSourceId: formData.get("saleSourceId"),
    saleSourceLabel: formData.get("saleSourceLabel"),
    saleSourceType: formData.get("saleSourceType"),
    seatCount: formData.get("seatCount"),
  });

  if (!parsed.success) {
    redirectToTicketSales("payout", "invalid");
  }

  const ticketPayout = requireTicketSalesDelegate(
    getTicketSalesPrisma().ticketPayout,
    "payout",
  );

  await ticketPayout.create?.({
    data: {
      checkoutType: parsed.data.checkoutType,
      createdByUserId: currentUser.id,
      dmName: parsed.data.dmName,
      dmPaymentProfileId: parsed.data.dmPaymentProfileId,
      dmUserId: parsed.data.dmUserId,
      grossTicketSalesUsd: parsed.data.grossTicketSalesUsd,
      notes: parsed.data.notes,
      payoutAmountUsd: calculatePayoutAmount(
        parsed.data.grossTicketSalesUsd,
        parsed.data.payoutRatePct,
      ),
      payoutRatePct: parsed.data.payoutRatePct,
      saleSourceId: parsed.data.saleSourceId,
      saleSourceLabel: parsed.data.saleSourceLabel,
      saleSourceType: parsed.data.saleSourceType,
      seatCount: parsed.data.seatCount,
      status: "PENDING",
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("payout", "created");
}

export async function createPendingDmPayouts(formData: FormData) {
  const currentUser = await requireTicketSalesAdminUser();
  const parsed = pendingDmPayoutCreateSchema.safeParse({
    candidatesJson: formData.get("candidatesJson"),
  });

  if (!parsed.success) {
    redirectToTicketSales("payout", "invalid");
  }

  let rawCandidates: unknown;

  try {
    rawCandidates = JSON.parse(parsed.data.candidatesJson);
  } catch {
    redirectToTicketSales("payout", "invalid");
  }

  const candidatesParsed = z.array(payoutCreateSchema).min(1).safeParse(rawCandidates);

  if (!candidatesParsed.success) {
    redirectToTicketSales("payout", "invalid");
  }

  const ticketPayout = requireTicketSalesDelegate(
    getTicketSalesPrisma().ticketPayout,
    "payout",
  );
  const groupKey = `payout-group-${crypto.randomUUID()}`;

  for (const candidate of candidatesParsed.data) {
    await ticketPayout.create?.({
      data: {
        checkoutType: candidate.checkoutType,
        createdByUserId: currentUser.id,
        dmName: candidate.dmName,
        dmPaymentProfileId: candidate.dmPaymentProfileId,
        dmUserId: candidate.dmUserId,
        grossTicketSalesUsd: candidate.grossTicketSalesUsd,
        groupKey,
        notes: candidate.notes,
        payoutAmountUsd: calculatePayoutAmount(
          candidate.grossTicketSalesUsd,
          candidate.payoutRatePct,
        ),
        payoutRatePct: candidate.payoutRatePct,
        saleSourceId: candidate.saleSourceId,
        saleSourceLabel: candidate.saleSourceLabel,
        saleSourceType: candidate.saleSourceType,
        seatCount: candidate.seatCount,
        status: "PENDING",
      },
    });
  }

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("payout", "created");
}

function buildAdjustedGrossAmounts(
  payouts: Array<{
    grossTicketSalesUsd: number;
    id: string;
  }>,
  nextGrossTotalUsd: number,
) {
  if (!payouts.length) {
    return [];
  }

  const currentTotalUsd = payouts.reduce((sum, payout) => sum + payout.grossTicketSalesUsd, 0);

  if (currentTotalUsd <= 0) {
    const evenSplitUsd = Math.round((nextGrossTotalUsd / payouts.length) * 100) / 100;
    const remainderUsd = Math.round((nextGrossTotalUsd - evenSplitUsd * payouts.length) * 100) / 100;

    return payouts.map((payout, index) => ({
      grossTicketSalesUsd:
        index === payouts.length - 1
          ? Math.round((evenSplitUsd + remainderUsd) * 100) / 100
          : evenSplitUsd,
      id: payout.id,
    }));
  }

  let assignedTotalUsd = 0;

  return payouts.map((payout, index) => {
    if (index === payouts.length - 1) {
      return {
        grossTicketSalesUsd: Math.round((nextGrossTotalUsd - assignedTotalUsd) * 100) / 100,
        id: payout.id,
      };
    }

    const proportionalGrossUsd = Math.round(
      nextGrossTotalUsd * (payout.grossTicketSalesUsd / currentTotalUsd) * 100,
    ) / 100;

    assignedTotalUsd = Math.round((assignedTotalUsd + proportionalGrossUsd) * 100) / 100;

    return {
      grossTicketSalesUsd: proportionalGrossUsd,
      id: payout.id,
    };
  });
}

export async function updateTicketPayoutGroup(formData: FormData) {
  await requireTicketSalesAdminUser();
  const parsed = payoutGroupUpdateSchema.safeParse({
    dmPaymentProfileId: formData.get("dmPaymentProfileId"),
    eventTicketSalesUsd: formData.get("eventTicketSalesUsd"),
    groupKeyOrPayoutId: formData.get("groupKeyOrPayoutId"),
    isGrouped: formData.get("isGrouped") === "true",
    leagueTicketSalesUsd: formData.get("leagueTicketSalesUsd"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirectToTicketSales("payout", "invalid");
  }

  const prismaTicketSales = getTicketSalesPrisma();
  const dmPaymentProfile = requireTicketSalesDelegate(
    prismaTicketSales.dmPaymentProfile,
    "payout",
  );
  const ticketPayout = requireTicketSalesDelegate(
    prismaTicketSales.ticketPayout,
    "payout",
  );

  let paymentProfile = null;

  if (parsed.data.dmPaymentProfileId) {
    paymentProfile = await dmPaymentProfile.findUnique?.({
      where: {
        id: parsed.data.dmPaymentProfileId,
      },
    });

    if (!paymentProfile) {
      redirectToTicketSales("payout", "invalid");
    }
  }

  if (parsed.data.status === "PAID") {
    const hasPaymentMethod = Boolean(
      paymentProfile &&
        paymentProfile.isActive &&
        paymentProfile.paymentMethodType &&
        (paymentProfile.paymentMethodLabel ||
          paymentProfile.paymentDetails ||
          paymentProfile.contactEmail),
    );

    if (!hasPaymentMethod) {
      redirectToTicketSales("payout", "missing-method");
    }
  }

  const existingPayouts = await ticketPayout.findMany?.({
    where: parsed.data.isGrouped
      ? {
          groupKey: parsed.data.groupKeyOrPayoutId,
        }
      : {
          id: parsed.data.groupKeyOrPayoutId,
        },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      checkoutType: true,
      grossTicketSalesUsd: true,
      id: true,
      paidAt: true,
      paidPayoutRatePct: true,
      payoutRatePct: true,
    },
  });

  if (!existingPayouts?.length) {
    redirectToTicketSales("payout", "invalid");
  }

  const leaguePayouts = existingPayouts.filter((payout) => payout.checkoutType === "LEAGUE");
  const eventPayouts = existingPayouts.filter((payout) => payout.checkoutType === "GRIMOIRE");
  const nextLeagueGrossAmounts = buildAdjustedGrossAmounts(
    leaguePayouts,
    parsed.data.leagueTicketSalesUsd,
  );
  const nextEventGrossAmounts = buildAdjustedGrossAmounts(
    eventPayouts,
    parsed.data.eventTicketSalesUsd,
  );
  const nextGrossAmountsById = new Map(
    [...nextLeagueGrossAmounts, ...nextEventGrossAmounts].map((entry) => [entry.id, entry.grossTicketSalesUsd]),
  );

  for (const payout of existingPayouts) {
    const nextGrossTicketSalesUsd =
      nextGrossAmountsById.get(payout.id) ?? payout.grossTicketSalesUsd;

    await ticketPayout.update?.({
      where: {
        id: payout.id,
      },
      data: {
        dmPaymentProfileId: parsed.data.dmPaymentProfileId,
        grossTicketSalesUsd: nextGrossTicketSalesUsd,
        notes: parsed.data.notes,
        paidAt:
          parsed.data.status === "PAID"
            ? payout.paidAt ?? new Date()
            : null,
        paidPayoutRatePct:
          parsed.data.status === "PAID"
            ? payout.paidPayoutRatePct ?? payout.payoutRatePct
            : null,
        payoutAmountUsd: calculatePayoutAmount(
          nextGrossTicketSalesUsd,
          payout.payoutRatePct,
        ),
        status: parsed.data.status,
      },
    });
  }

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("payout", "updated");
}

export async function updateTicketPayout(formData: FormData) {
  await requireTicketSalesAdminUser();
  const parsed = payoutUpdateSchema.safeParse({
    dmPaymentProfileId: formData.get("dmPaymentProfileId"),
    grossTicketSalesUsd: formData.get("grossTicketSalesUsd"),
    notes: formData.get("notes"),
    payoutId: formData.get("payoutId"),
    payoutRatePct: formData.get("payoutRatePct"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirectToTicketSales("payout", "invalid");
  }

  const prismaTicketSales = getTicketSalesPrisma();
  const dmPaymentProfile = requireTicketSalesDelegate(
    prismaTicketSales.dmPaymentProfile,
    "payout",
  );
  const ticketPayout = requireTicketSalesDelegate(
    prismaTicketSales.ticketPayout,
    "payout",
  );

  let paymentProfile = null;

  if (parsed.data.dmPaymentProfileId) {
    paymentProfile = await dmPaymentProfile.findUnique?.({
      where: {
        id: parsed.data.dmPaymentProfileId,
      },
    });

    if (!paymentProfile) {
      redirectToTicketSales("payout", "invalid");
    }
  }

  if (parsed.data.status === "PAID") {
    const hasPaymentMethod = Boolean(
      paymentProfile &&
        paymentProfile.isActive &&
        paymentProfile.paymentMethodType &&
        (paymentProfile.paymentMethodLabel ||
          paymentProfile.paymentDetails ||
          paymentProfile.contactEmail),
    );

  if (!hasPaymentMethod) {
      redirectToTicketSales("payout", "missing-method");
    }
  }

  const existingPayout = await ticketPayout.findUnique?.({
    where: {
      id: parsed.data.payoutId,
    },
    select: {
      paidAt: true,
      paidPayoutRatePct: true,
    },
  });

  if (!existingPayout) {
    redirectToTicketSales("payout", "invalid");
  }

  await ticketPayout.update?.({
    where: {
      id: parsed.data.payoutId,
    },
    data: {
      dmPaymentProfileId: parsed.data.dmPaymentProfileId,
      grossTicketSalesUsd: parsed.data.grossTicketSalesUsd,
      notes: parsed.data.notes,
      paidAt:
        parsed.data.status === "PAID"
          ? existingPayout.paidAt ?? new Date()
          : null,
      paidPayoutRatePct:
        parsed.data.status === "PAID"
          ? existingPayout.paidPayoutRatePct ?? parsed.data.payoutRatePct
          : null,
      payoutAmountUsd: calculatePayoutAmount(
        parsed.data.grossTicketSalesUsd,
        parsed.data.payoutRatePct,
      ),
      payoutRatePct: parsed.data.payoutRatePct,
      status: parsed.data.status,
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("payout", "updated");
}
