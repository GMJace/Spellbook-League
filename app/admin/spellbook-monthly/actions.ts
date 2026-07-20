"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";
import { GRIMOIRE_GUILD_MEMBERSHIP_SETTINGS_ID } from "@/lib/grimoire-guild-membership";
import { prisma } from "@/lib/prisma";

const spellbookMonthlySubscriberRemovalSchema = z.object({
  subscriberId: z.string().min(1),
});

const grimoireGuildMembershipSettingsSchema = z.object({
  description: z.string().trim().min(5).max(500),
  durationDays: z.coerce.number().int().min(1).max(3660),
  isActive: z.boolean(),
  priceUsd: z.coerce.number().min(0.01).max(500),
  productName: z.string().trim().min(2).max(120),
});

export async function deleteSpellbookMonthlySubscriber(formData: FormData) {
  await requireAdminUser();

  const parsed = spellbookMonthlySubscriberRemovalSchema.safeParse({
    subscriberId: formData.get("subscriberId"),
  });

  if (!parsed.success) {
    redirect("/admin/spellbook-monthly?subscriber=invalid");
  }

  const deletedSubscriber = await prisma.spellbookMonthlySubscriber.deleteMany({
    where: {
      id: parsed.data.subscriberId,
    },
  });

  if (!deletedSubscriber.count) {
    redirect("/admin/spellbook-monthly?subscriber=invalid");
  }

  revalidatePath("/admin/spellbook-monthly");
  redirect("/admin/spellbook-monthly?subscriber=deleted");
}

export async function updateGrimoireGuildMembershipSettings(formData: FormData) {
  await requireAdminUser();

  const parsed = grimoireGuildMembershipSettingsSchema.safeParse({
    description: formData.get("description"),
    durationDays: formData.get("durationDays"),
    isActive: formData.get("isActive") === "on",
    priceUsd: formData.get("priceUsd"),
    productName: formData.get("productName"),
  });

  if (!parsed.success) {
    redirect("/admin/spellbook-monthly?membership=invalid");
  }

  await prisma.grimoireGuildMembershipSettings.upsert({
    where: {
      id: GRIMOIRE_GUILD_MEMBERSHIP_SETTINGS_ID,
    },
    update: {
      description: parsed.data.description,
      durationDays: parsed.data.durationDays,
      isActive: parsed.data.isActive,
      priceUsd: parsed.data.priceUsd,
      productName: parsed.data.productName,
    },
    create: {
      id: GRIMOIRE_GUILD_MEMBERSHIP_SETTINGS_ID,
      description: parsed.data.description,
      durationDays: parsed.data.durationDays,
      isActive: parsed.data.isActive,
      priceUsd: parsed.data.priceUsd,
      productName: parsed.data.productName,
    },
  });

  revalidatePath("/admin/spellbook-monthly");
  revalidatePath("/league/cart");
  revalidatePath("/player");

  redirect("/admin/spellbook-monthly?membership=updated");
}
