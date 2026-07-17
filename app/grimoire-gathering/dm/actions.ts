"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getGrimoireEventById, getSlotsForEvent } from "@/lib/grimoire-server";
import { prisma } from "@/lib/prisma";

const submissionSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  discord: z.string().trim().optional(),
  title: z.string().trim().min(1),
  gameCode: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  slotStartAt: z.string().trim().min(1),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  seats: z.number().int().min(1).max(8),
  serviceHours: z.string().trim().optional(),
  downtimeDaysAwarded: z.string().trim().optional(),
  rewardsSummary: z.string().trim().optional(),
  magicItemsAwarded: z.string().trim().optional(),
  consumablesAwarded: z.string().trim().optional(),
  sessionNotes: z.string().trim().optional(),
  summary: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

function formatSubmissionNotes(data: {
  serviceHours?: string;
  downtimeDaysAwarded?: string;
  rewardsSummary?: string;
  magicItemsAwarded?: string;
  consumablesAwarded?: string;
  sessionNotes?: string;
  notes?: string;
}) {
  const sections = [
    data.serviceHours ? `Service hours (AL DM rewards): ${data.serviceHours}` : null,
    data.downtimeDaysAwarded
      ? `Downtime days awarded: ${data.downtimeDaysAwarded}`
      : null,
    data.rewardsSummary ? `Awarded Gold: ${data.rewardsSummary}` : null,
    data.magicItemsAwarded ? `Magic items awarded: ${data.magicItemsAwarded}` : null,
    data.consumablesAwarded
      ? `Consumables awarded: ${data.consumablesAwarded}`
      : null,
    data.sessionNotes ? `Session notes/Story Awards: ${data.sessionNotes}` : null,
    data.notes ? `Notes for staff: ${data.notes}` : null,
  ].filter(Boolean);

  return sections.length ? sections.join("\n\n") : null;
}

export async function createGrimoireDmSubmission(payload: {
  name: string;
  email: string;
  discord: string;
  title: string;
  gameCode: string;
  eventId: string;
  slotStartAt: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  seats: number;
  serviceHours: string;
  downtimeDaysAwarded: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  sessionNotes: string;
  summary: string;
  notes: string;
}) {
  const parsed = submissionSchema.safeParse(payload);

  if (!parsed.success) {
    return { error: "Please complete all required DM submission fields." };
  }

  const event = await getGrimoireEventById(parsed.data.eventId);

  if (!event) {
    return { error: "Please choose one of the published Grimoire events." };
  }

  const slots = await getSlotsForEvent(event.id);
  const selectedSlot = slots.find((slot) => slot.startAt === parsed.data.slotStartAt);

  if (!selectedSlot) {
    return { error: "Please choose one of the listed event time slots." };
  }

  await prisma.grimoireDmSubmission.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      discord: parsed.data.discord || null,
      title: parsed.data.title,
      gameCode: parsed.data.gameCode,
      eventId: event.id,
      slotStartAt: new Date(parsed.data.slotStartAt),
      tier: parsed.data.tier,
      seats: parsed.data.seats,
      summary: parsed.data.summary,
      notes: formatSubmissionNotes(parsed.data),
      status: "PENDING",
    },
  });

  revalidatePath("/admin/grimoire-gathering");
  revalidatePath("/grimoire-gathering/dm");

  return {
    success:
      "Your Grimoire DM submission has been received and is now pending admin review.",
  };
}
