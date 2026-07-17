"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const spellbookMonthlySubscriberRemovalSchema = z.object({
  subscriberId: z.string().min(1),
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
