"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  buildStoredGameRewardStrings,
  hasStructuredGameRewardSelectionFields,
  readGameRewardSelectionsFromFormData,
} from "@/lib/game-reward-selections";
import { getGrimoireEventById } from "@/lib/grimoire-server";
import { prisma } from "@/lib/prisma";

const submissionSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  discord: z.string().trim().optional(),
  title: z.string().trim().min(1),
  gameCode: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  eventSlotId: z.string().trim().min(1),
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

export async function createGrimoireDmSubmission(formData: FormData) {
  const rewardStrings = hasStructuredGameRewardSelectionFields(formData)
    ? buildStoredGameRewardStrings(readGameRewardSelectionsFromFormData(formData))
    : {
        magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
        consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
      };
  const parsed = submissionSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    discord: String(formData.get("discord") ?? ""),
    title: String(formData.get("title") ?? ""),
    gameCode: String(formData.get("gameCode") ?? ""),
    eventId: String(formData.get("eventId") ?? ""),
    eventSlotId: String(formData.get("eventSlotId") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    seats: Number(formData.get("seats") ?? 6),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    downtimeDaysAwarded: String(formData.get("downtimeDaysAwarded") ?? ""),
    rewardsSummary: String(formData.get("rewardsSummary") ?? ""),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    sessionNotes: String(formData.get("sessionNotes") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return { error: "Please complete all required DM submission fields." };
  }

  const event = await getGrimoireEventById(parsed.data.eventId);

  if (!event) {
    return { error: "Please choose one of the published Grimoire events." };
  }

  const selectedSlot = await prisma.grimoireEventSlot.findUnique({
    where: { id: parsed.data.eventSlotId },
    select: {
      eventId: true,
      gameSlotCount: true,
      id: true,
      label: true,
      startAt: true,
    },
  });

  if (!selectedSlot || selectedSlot.eventId !== event.id) {
    return { error: "Please choose one of the listed event time slots." };
  }

  const [curatedGameCount, submissionCount] = await Promise.all([
    prisma.grimoireCuratedGame.count({
      where: {
        eventId: event.id,
        startAt: selectedSlot.startAt,
      },
    }),
    prisma.grimoireDmSubmission.count({
      where: {
        eventId: event.id,
        slotStartAt: selectedSlot.startAt,
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
    }),
  ]);
  const filledGameSlots = curatedGameCount + submissionCount;

  if (filledGameSlots >= selectedSlot.gameSlotCount) {
    return {
      error: `${selectedSlot.label} is already full. Choose another event time slot or ask an event admin to open more tables.`,
    };
  }

  await prisma.grimoireDmSubmission.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      discord: parsed.data.discord || null,
      title: parsed.data.title,
      gameCode: parsed.data.gameCode,
      eventId: event.id,
      slotStartAt: selectedSlot.startAt,
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
