"use server";

import { CheckoutType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireTicketSalesAdminUser } from "@/lib/admin";
import {
  calculatePayoutAmount,
  DM_PAYMENT_METHOD_TYPES,
  TICKET_PAYOUT_STATUSES,
  TICKET_SALE_SOURCE_TYPES,
} from "@/lib/ticket-sales";
import { prisma } from "@/lib/prisma";

const ticketSalesPath = "/admin/ticket-sales";

const settingsSchema = z.object({
  defaultDmPayoutRatePct: z.coerce.number().min(0).max(100),
  federalTaxRatePct: z.coerce.number().min(0).max(100),
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
    ticketSalesSettings?: {
      upsert?: (...args: any[]) => Promise<any>;
    };
  };
}

function requireTicketSalesDelegate<TDelegate>(
  delegate: TDelegate,
  section: "payment" | "payout" | "refund" | "settings",
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
  checkoutOrderId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  checkoutType: z.nativeEnum(CheckoutType),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  reason: z.string().trim().min(2).max(240),
  refundedAt: z.string().trim().or(z.literal("")),
  saleSourceId: z.string().trim().max(191).or(z.literal("")).transform((value) => value || null),
  saleSourceLabel: z.string().trim().min(1).max(240),
  saleSourceType: ticketSaleSourceTypeEnum,
});

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

const payoutUpdateSchema = z.object({
  dmPaymentProfileId: z.string().trim().min(1).max(191).or(z.literal("")).transform((value) => value || null),
  grossTicketSalesUsd: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(2000).or(z.literal("")).transform((value) => value || null),
  payoutId: z.string().trim().min(1).max(191),
  payoutRatePct: z.coerce.number().min(0).max(100),
  status: ticketPayoutStatusEnum,
});

function redirectToTicketSales(
  section: "payment" | "payout" | "refund" | "settings",
  status: string,
): never {
  const params = new URLSearchParams();
  params.set(section, status);
  redirect(`${ticketSalesPath}?${params.toString()}`);
}

function parseOptionalDate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function saveTicketSalesSettings(formData: FormData) {
  const currentUser = await requireTicketSalesAdminUser();
  const parsed = settingsSchema.safeParse({
    defaultDmPayoutRatePct: formData.get("defaultDmPayoutRatePct"),
    federalTaxRatePct: formData.get("federalTaxRatePct"),
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
      defaultDmPayoutRatePct: parsed.data.defaultDmPayoutRatePct,
      federalTaxRatePct: parsed.data.federalTaxRatePct,
      provincialTaxRatePct: parsed.data.provincialTaxRatePct,
      updatedByUserId: currentUser.id,
    },
    create: {
      defaultDmPayoutRatePct: parsed.data.defaultDmPayoutRatePct,
      federalTaxRatePct: parsed.data.federalTaxRatePct,
      id: "default",
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
    checkoutType: formData.get("checkoutType"),
    notes: formData.get("notes"),
    reason: formData.get("reason"),
    refundedAt: formData.get("refundedAt"),
    saleSourceId: formData.get("saleSourceId"),
    saleSourceLabel: formData.get("saleSourceLabel"),
    saleSourceType: formData.get("saleSourceType"),
  });

  if (!parsed.success) {
    redirectToTicketSales("refund", "invalid");
  }

  const refundedAt = parseOptionalDate(parsed.data.refundedAt);

  if (parsed.data.refundedAt && !refundedAt) {
    redirectToTicketSales("refund", "invalid");
  }

  const ticketRefund = requireTicketSalesDelegate(
    getTicketSalesPrisma().ticketRefund,
    "refund",
  );

  await ticketRefund.create?.({
    data: {
      amountUsd: parsed.data.amountUsd,
      checkoutOrderId: parsed.data.checkoutOrderId,
      checkoutType: parsed.data.checkoutType,
      createdByUserId: currentUser.id,
      notes: parsed.data.notes,
      reason: parsed.data.reason,
      refundedAt: refundedAt ?? new Date(),
      saleSourceId: parsed.data.saleSourceId,
      saleSourceLabel: parsed.data.saleSourceLabel,
      saleSourceType: parsed.data.saleSourceType,
    },
  });

  revalidatePath(ticketSalesPath);
  redirectToTicketSales("refund", "created");
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
