"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const serviceActivityMap = {
  AL_CAMPAIGN: {
    label: "Dungeon Mastering any AL campaign",
    fixedHours: 0,
  },
  PREP_TIME: {
    label: "Prep time",
    fixedHours: 0,
  },
  SESSION_ZERO_SERVICE: {
    label: "Running Session Zeroes",
    fixedHours: 0,
  },
  MENTORING_SERVICE: {
    label: "Mentoring new DMs during their sessions",
    fixedHours: 0,
  },
  NEW_SKILLS: {
    label: "DMs' New Skills",
    fixedHours: 5,
  },
  MENTORING_ACHIEVEMENT: {
    label: "Mentoring New DMs",
    fixedHours: 5,
  },
  LEARN_TO_PLAY: {
    label: "Running Learn-to-Plays",
    fixedHours: 5,
  },
  SESSION_ZERO_ACHIEVEMENT: {
    label: "Session Zeroes",
    fixedHours: 5,
  },
  ONLINE_DMS: {
    label: "Online DMs",
    fixedHours: 10,
  },
  ENTIRE_BOOKS: {
    label: "Entire Books",
    fixedHours: 10,
  },
  SLOT_ZERO_DMS: {
    label: "Slot Zero DMs",
    fixedHours: 10,
  },
  KIDS_TABLES: {
    label: "Kids' Tables",
    fixedHours: 10,
  },
  EVENT_DMS: {
    label: "Event DMs",
    fixedHours: 20,
  },
  LAST_MINUTE_DMS: {
    label: "Last Minute DMs",
    fixedHours: 20,
  },
  ENTIRE_NEW_RELEASE_BOOKS: {
    label: "Entire New Release Books",
    fixedHours: 20,
  },
  DM_PLAYTESTERS: {
    label: "DM Playtesters",
    fixedHours: 20,
  },
  DMSGUILD_LEVIATHANS: {
    label: "DMsGuild Leviathans",
    fixedHours: 40,
  },
  SIX_HOUR_EVENT_DMS: {
    label: "6-Hour Event DMs",
    fixedHours: 40,
  },
  FIRST_TIME_DMS: {
    label: "1st Time DMs",
    fixedHours: 40,
  },
  OUTLANDER: {
    label: "Outlander",
    fixedHours: 40,
  },
  MORE_INCLUSIVE_TABLES: {
    label: "More Inclusive Tables",
    fixedHours: 40,
  },
} as const;

const createServiceLogSchema = z.object({
  activityType: z.enum([
    "AL_CAMPAIGN",
    "PREP_TIME",
    "SESSION_ZERO_SERVICE",
    "MENTORING_SERVICE",
    "NEW_SKILLS",
    "MENTORING_ACHIEVEMENT",
    "LEARN_TO_PLAY",
    "SESSION_ZERO_ACHIEVEMENT",
    "ONLINE_DMS",
    "ENTIRE_BOOKS",
    "SLOT_ZERO_DMS",
    "KIDS_TABLES",
    "EVENT_DMS",
    "LAST_MINUTE_DMS",
    "ENTIRE_NEW_RELEASE_BOOKS",
    "DM_PLAYTESTERS",
    "DMSGUILD_LEVIATHANS",
    "SIX_HOUR_EVENT_DMS",
    "FIRST_TIME_DMS",
    "OUTLANDER",
    "MORE_INCLUSIVE_TABLES",
  ]),
  activityDate: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  adventureCode: z.string().trim().max(80).optional(),
  sessionHours: z.coerce.number().min(0).max(999).default(0),
  safetyToolSessions: z.coerce.number().int().min(0).max(999).default(0),
  newAlPlayerCount: z.coerce.number().int().min(0).max(999).default(0),
  notes: z.string().trim().max(2000).optional(),
});

const deleteServiceLogSchema = z.object({
  logId: z.string().trim().min(1),
});

function redirectWithStatus(status: string): never {
  redirect(`/dm/service-awards?service=${encodeURIComponent(status)}`);
}

export async function createDmServiceLog(formData: FormData) {
  const user = await requireRole("DM");
  const parsed = createServiceLogSchema.safeParse({
    activityType: formData.get("activityType"),
    activityDate: formData.get("activityDate"),
    title: formData.get("title"),
    adventureCode: formData.get("adventureCode"),
    sessionHours: formData.get("sessionHours") || "0",
    safetyToolSessions: formData.get("safetyToolSessions") || "0",
    newAlPlayerCount: formData.get("newAlPlayerCount") || "0",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirectWithStatus("invalid");
  }

  const activityDate = new Date(`${parsed.data.activityDate}T12:00:00`);

  if (Number.isNaN(activityDate.getTime())) {
    redirectWithStatus("invalid");
  }

  const activity = serviceActivityMap[parsed.data.activityType];
  const achievementHours = activity.fixedHours;
  const sessionHours = achievementHours > 0 ? 0 : parsed.data.sessionHours;
  const totalHours =
    sessionHours +
    achievementHours +
    parsed.data.safetyToolSessions +
    parsed.data.newAlPlayerCount;

  if (totalHours <= 0) {
    redirectWithStatus("invalid");
  }

  await prisma.dmServiceLog.create({
    data: {
      userId: user.id,
      activityType: parsed.data.activityType,
      activityLabel: activity.label,
      title: parsed.data.title,
      adventureCode: parsed.data.adventureCode ?? "",
      activityDate,
      sessionHours,
      safetyToolSessions: parsed.data.safetyToolSessions,
      newAlPlayerCount: parsed.data.newAlPlayerCount,
      achievementHours,
      totalHours,
      notes: parsed.data.notes ?? "",
    },
  });

  revalidatePath("/dm/service-awards");
  redirectWithStatus("created");
}

export async function deleteDmServiceLog(formData: FormData) {
  const user = await requireRole("DM");
  const parsed = deleteServiceLogSchema.safeParse({
    logId: formData.get("logId"),
  });

  if (!parsed.success) {
    redirectWithStatus("invalid");
  }

  await prisma.dmServiceLog.deleteMany({
    where: {
      id: parsed.data.logId,
      userId: user.id,
    },
  });

  revalidatePath("/dm/service-awards");
  redirectWithStatus("deleted");
}
