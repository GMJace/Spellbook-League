import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  sendSpellbookMonthlySubscriberConfirmationEmail,
  sendSpellbookMonthlySubscriptionEmail,
} from "@/lib/transactional-email";

export const SPELLBOOK_MONTHLY_EMAIL = "jace@spellbookpublishing.com";

export const SPELLBOOK_MONTHLY_SUCCESS_MESSAGE =
  "Thank you for joining the SPELLBOOK monthly subscriber list. Watch your email for the drops every month!";
export const SPELLBOOK_MONTHLY_ALREADY_SUBSCRIBED_MESSAGE =
  "You are already subscribed to SPELLBOOK Monthly. Watch your inbox for future updates.";
export const SPELLBOOK_MONTHLY_SAVED_NO_EMAIL_MESSAGE =
  "Your subscription was saved. Email delivery is unavailable right now, but you're on the SPELLBOOK Monthly list.";
export const SPELLBOOK_MONTHLY_LOCAL_SAVED_NO_EMAIL_MESSAGE =
  SPELLBOOK_MONTHLY_SUCCESS_MESSAGE;
export const SPELLBOOK_MONTHLY_SAVE_ERROR_MESSAGE =
  "Your subscription could not be saved right now. Please try again shortly.";

export const spellbookMonthlySchema = z.object({
  email: z.string().trim().email(),
});

function normalizeSubscriberEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function saveSpellbookMonthlySubscriber(email: string) {
  const normalizedEmail = normalizeSubscriberEmail(email);
  const existingSubscriber = await prisma.spellbookMonthlySubscriber.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingSubscriber) {
    const subscriber = await prisma.spellbookMonthlySubscriber.update({
      where: {
        id: existingSubscriber.id,
      },
      data: {
        lastSubscribedAt: new Date(),
      },
    });

    return {
      subscriber,
      wasCreated: false,
    };
  }

  const subscriber = await prisma.spellbookMonthlySubscriber.create({
    data: {
      email: normalizedEmail,
      lastSubscribedAt: new Date(),
    },
  });

  return {
    subscriber,
    wasCreated: true,
  };
}

export async function processSpellbookMonthlySubscription(email: string) {
  const { subscriber, wasCreated } = await saveSpellbookMonthlySubscriber(email);

  if (!wasCreated) {
    return {
      subscriber,
      wasCreated,
      success: SPELLBOOK_MONTHLY_ALREADY_SUBSCRIBED_MESSAGE,
    };
  }

  try {
    await sendSpellbookMonthlySubscriptionEmail({
      to: SPELLBOOK_MONTHLY_EMAIL,
      subscriberEmail: subscriber.email,
    });
    await sendSpellbookMonthlySubscriberConfirmationEmail({
      subscriberEmail: subscriber.email,
    });
  } catch (error) {
    console.error("Failed to send SPELLBOOK Monthly subscription email.", error);

    if (process.env.NODE_ENV !== "production") {
      console.info("SPELLBOOK Monthly local-dev subscription request:", {
        subscriberEmail: subscriber.email,
        to: SPELLBOOK_MONTHLY_EMAIL,
      });

      return {
        subscriber,
        wasCreated,
        success: SPELLBOOK_MONTHLY_LOCAL_SAVED_NO_EMAIL_MESSAGE,
      };
    }

    return {
      subscriber,
      wasCreated,
      success: SPELLBOOK_MONTHLY_SAVED_NO_EMAIL_MESSAGE,
    };
  }

  return {
    subscriber,
    wasCreated,
    success: SPELLBOOK_MONTHLY_SUCCESS_MESSAGE,
  };
}

export async function getSpellbookMonthlySubscribers() {
  return prisma.spellbookMonthlySubscriber.findMany({
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  });
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function buildSpellbookMonthlyCsv(
  subscribers: Array<{
    email: string;
    createdAt: Date;
    lastSubscribedAt: Date;
  }>
) {
  const header = ["Email", "First Subscribed At", "Last Signup Attempt At"];
  const rows = subscribers.map((subscriber) => [
    subscriber.email,
    subscriber.createdAt.toISOString(),
    subscriber.lastSubscribedAt.toISOString(),
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
}
