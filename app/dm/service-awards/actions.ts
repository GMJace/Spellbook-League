"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { dmServiceActivityMap, dmServiceActivityValues } from "@/lib/dm-service-awards";
import { prisma } from "@/lib/prisma";

const createServiceLogSchema = z.object({
  activityDate: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  adventureCode: z.string().trim().max(80).optional(),
  safetyToolsUsed: z.enum(["yes", "no"]).default("no"),
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
    activityDate: formData.get("activityDate"),
    title: formData.get("title"),
    adventureCode: formData.get("adventureCode"),
    safetyToolsUsed: formData.get("safetyToolsUsed") === "yes" ? "yes" : "no",
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

  const activityTypes = formData
    .getAll("activityType")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const activityHours = formData.getAll("activityHours").map((value) => Number(value ?? 0));
  const safetyToolSessions = parsed.data.safetyToolsUsed === "yes" ? 1 : 0;
  const rows = activityTypes.flatMap((activityType, index) => {
    if (!dmServiceActivityValues.includes(activityType as (typeof dmServiceActivityValues)[number])) {
      return [];
    }

    const activity = dmServiceActivityMap[activityType as keyof typeof dmServiceActivityMap];
    const rawHours = activityHours[index] ?? 0;
    const enteredHours = Number.isFinite(rawHours) ? Math.max(0, Math.min(rawHours, 999)) : 0;
    const achievementHours = activity.fixedHours;
    const sessionHours = achievementHours > 0 ? 0 : enteredHours;
    const isFirstRow = index === 0;
    const rowSafetyHours = isFirstRow ? safetyToolSessions : 0;
    const rowNewPlayerHours = isFirstRow ? parsed.data.newAlPlayerCount : 0;
    const totalHours = sessionHours + achievementHours + rowSafetyHours + rowNewPlayerHours;

    if (totalHours <= 0) {
      return [];
    }

    return [
      {
        activity,
        achievementHours,
        newAlPlayerCount: rowNewPlayerHours,
        safetyToolSessions: rowSafetyHours,
        sessionHours,
        totalHours,
      },
    ];
  });

  if (!rows.length) {
    redirectWithStatus("invalid");
  }

  await prisma.dmServiceLog.createMany({
    data: rows.map((row) => ({
      userId: user.id,
      activityType: row.activity.value,
      activityLabel: row.activity.label,
      title: rows.length > 1 ? `${parsed.data.title} - ${row.activity.label}` : parsed.data.title,
      adventureCode: parsed.data.adventureCode ?? "",
      activityDate,
      sessionHours: row.sessionHours,
      safetyToolSessions: row.safetyToolSessions,
      newAlPlayerCount: row.newAlPlayerCount,
      achievementHours: row.achievementHours,
      totalHours: row.totalHours,
      notes: parsed.data.notes ?? "",
    })),
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
