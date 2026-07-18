"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";
import { ADMIN_EMAILS, isAdminEmail } from "@/lib/admin-access";
import { createNotifications } from "@/lib/notifications";
import { removeProDmReview as removeStoredProDmReview } from "@/lib/pro-dm-reviews";
import { setProDmRosterListing } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";

export type RemoveUserState = {
  error: string;
  success: string;
};

const proDmRosterSchema = z.object({
  targetUserId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
});

const eventAdminRoleSchema = z.object({
  targetUserId: z.string().min(1),
});

const proDmReviewRemovalSchema = z.object({
  reviewId: z.string().min(1),
});

const adminNotificationSchema = z.object({
  targetUserId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1200),
});

async function getDmUserOrRedirect(targetUserId: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!targetUser) {
    redirect("/admin/users?proDm=invalid");
  }

  return targetUser;
}

async function getDmUserOrRedirectForPath(targetUserId: string, invalidPath: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!targetUser) {
    redirect(invalidPath);
  }

  return targetUser;
}

export async function addProDmToRoster(formData: FormData) {
  const adminUser = await requireAdminUser();

  const parsed = proDmRosterSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    rating: formData.get("rating"),
  });

  if (!parsed.success) {
    redirect("/admin/users?proDm=invalid");
  }

  const targetUser = await getDmUserOrRedirect(parsed.data.targetUserId);

  await setProDmRosterListing(targetUser.id, true, parsed.data.rating);
  await createNotifications(prisma, [
    {
      userId: targetUser.id,
      createdByUserId: adminUser.id,
      type: "PRO_DM_ROSTER",
      title: "Added to the Professional DM roster",
      body: "Your public Hire a DM profile is now live.",
      details: [
        { label: "Rating", value: `${parsed.data.rating} star${parsed.data.rating === 1 ? "" : "s"}` },
      ],
      actionLabel: "View public page",
      actionHref: `/hire-a-dm/${targetUser.id}`,
    },
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/hire-a-dm");
  revalidatePath(`/hire-a-dm/${targetUser.id}`);

  redirect("/admin/users?proDm=added");
}

export async function updateProDmRating(formData: FormData) {
  const adminUser = await requireAdminUser();

  const parsed = proDmRosterSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    rating: formData.get("rating"),
  });

  if (!parsed.success) {
    redirect("/admin/users?proDm=invalid");
  }

  const targetUser = await getDmUserOrRedirect(parsed.data.targetUserId);

  await setProDmRosterListing(targetUser.id, true, parsed.data.rating);
  await createNotifications(prisma, [
    {
      userId: targetUser.id,
      createdByUserId: adminUser.id,
      type: "PRO_DM_ROSTER",
      title: "Professional DM rating updated",
      body: "An admin updated your Professional DM roster rating.",
      details: [
        { label: "Rating", value: `${parsed.data.rating} star${parsed.data.rating === 1 ? "" : "s"}` },
      ],
      actionLabel: "View public page",
      actionHref: `/hire-a-dm/${targetUser.id}`,
    },
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/hire-a-dm");
  revalidatePath(`/hire-a-dm/${targetUser.id}`);

  redirect("/admin/users?proDm=updated");
}

export async function removeProDmFromRoster(formData: FormData) {
  const adminUser = await requireAdminUser();

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!targetUserId) {
    redirect("/admin/users?proDm=invalid");
  }

  const targetUser = await getDmUserOrRedirect(targetUserId);

  await setProDmRosterListing(targetUser.id, false);
  await createNotifications(prisma, [
    {
      userId: targetUser.id,
      createdByUserId: adminUser.id,
      type: "PRO_DM_ROSTER",
      title: "Removed from the Professional DM roster",
      body: "Your public Hire a DM profile is no longer listed.",
      actionLabel: "Review your profile",
      actionHref: "/profile",
    },
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/hire-a-dm");
  revalidatePath(`/hire-a-dm/${targetUser.id}`);

  redirect("/admin/users?proDm=removed");
}

export async function removeDmFromRoster(formData: FormData) {
  const adminUser = await requireAdminUser();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!targetUserId) {
    redirect("/admin/users?dmRoster=invalid");
  }

  const targetUser = await getDmUserOrRedirectForPath(
    targetUserId,
    "/admin/users?dmRoster=invalid"
  );

  await prisma.userRole.delete({
    where: {
      userId_role: {
        userId: targetUser.id,
        role: "DM",
      },
    },
  });

  await setProDmRosterListing(targetUser.id, false);
  await createNotifications(prisma, [
    {
      userId: targetUser.id,
      createdByUserId: adminUser.id,
      type: "PRO_DM_ROSTER",
      title: "Removed from the Dungeon Master roster",
      body: "Your Dungeon Master role was removed and any public Hire a DM listing was taken offline.",
      actionLabel: "Review your profile",
      actionHref: "/profile",
    },
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/dm");
  revalidatePath("/hire-a-dm");
  revalidatePath(`/hire-a-dm/${targetUser.id}`);

  redirect("/admin/users?dmRoster=removed");
}

export async function addEventAdminRole(formData: FormData) {
  const adminUser = await requireAdminUser();

  const parsed = eventAdminRoleSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    redirect("/admin/users?eventAdmin=invalid");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!targetUser || targetUser.id === adminUser.id) {
    redirect("/admin/users?eventAdmin=invalid");
  }

  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: targetUser.id,
        role: "EVENT_ADMIN",
      },
    },
    update: {},
    create: {
      userId: targetUser.id,
      role: "EVENT_ADMIN",
    },
  });

  await createNotifications(prisma, [
    {
      userId: targetUser.id,
      createdByUserId: adminUser.id,
      type: "ADMIN",
      title: "Granted Grimoire moderation access",
      body: "You can now access the Grimoire moderation tools.",
      actionLabel: "Open Grimoire moderation",
      actionHref: "/admin/grimoire-gathering",
    },
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/admin/grimoire-gathering");

  redirect("/admin/users?eventAdmin=added");
}

export async function removeEventAdminRole(formData: FormData) {
  const adminUser = await requireAdminUser();

  const parsed = eventAdminRoleSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    redirect("/admin/users?eventAdmin=invalid");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!targetUser || targetUser.id === adminUser.id) {
    redirect("/admin/users?eventAdmin=invalid");
  }

  await prisma.userRole.deleteMany({
    where: {
      userId: targetUser.id,
      role: "EVENT_ADMIN",
    },
  });

  await createNotifications(prisma, [
    {
      userId: targetUser.id,
      createdByUserId: adminUser.id,
      type: "ADMIN",
      title: "Removed Grimoire moderation access",
      body: "Your Event Admin access for Grimoire moderation was removed.",
      actionLabel: "Review account",
      actionHref: "/profile",
    },
  ]);

  revalidatePath("/admin/users");
  revalidatePath("/admin/grimoire-gathering");

  redirect("/admin/users?eventAdmin=removed");
}

export async function deleteProDmReview(formData: FormData) {
  await requireAdminUser();

  const parsed = proDmReviewRemovalSchema.safeParse({
    reviewId: formData.get("reviewId"),
  });

  if (!parsed.success) {
    redirect("/admin/users?review=invalid");
  }

  const removedReview = await removeStoredProDmReview(parsed.data.reviewId);

  if (!removedReview) {
    redirect("/admin/users?review=invalid");
  }

  revalidatePath("/admin/users");
  revalidatePath("/hire-a-dm");
  revalidatePath(`/hire-a-dm/${removedReview.userId}`);
  revalidatePath(`/hire-a-dm/${removedReview.userId}/rate`);

  redirect("/admin/users?review=deleted");
}

export async function createAdminNotification(formData: FormData) {
  const adminUser = await requireAdminUser();

  const parsed = adminNotificationSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    redirect("/admin/users?notification=invalid");
  }

  const recipients =
    parsed.data.targetUserId === "ALL_USERS"
      ? await prisma.user.findMany({
          select: { id: true },
        })
      : await prisma.user.findMany({
          where: {
            id: parsed.data.targetUserId,
          },
          select: { id: true },
        });

  if (!recipients.length) {
    redirect("/admin/users?notification=invalid");
  }

  await createNotifications(
    prisma,
    recipients.map((recipient) => ({
      userId: recipient.id,
      createdByUserId: adminUser.id,
      type: "ADMIN" as const,
      title: parsed.data.title,
      body: parsed.data.body,
    }))
  );

  revalidatePath("/admin/users");
  redirect("/admin/users?notification=sent");
}

export async function removeUserAccount(
  _previousState: RemoveUserState,
  formData: FormData
): Promise<RemoveUserState> {
  const adminUser = await requireAdminUser();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();

  if (!targetUserId) {
    return {
      error: "Choose a user before continuing.",
      success: "",
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!targetUser) {
    return {
      error: "That user could not be found.",
      success: "",
    };
  }

  if (targetUser.id === adminUser.id) {
    return {
      error: "You cannot remove the account you are currently using.",
      success: "",
    };
  }

  if (isAdminEmail(targetUser.email)) {
    return {
      error: `Protected admin accounts cannot be removed here (${ADMIN_EMAILS.join(", ")}).`,
      success: "",
    };
  }

  await prisma.user.delete({
    where: { id: targetUser.id },
  });

  revalidatePath("/admin/users");

  return {
    error: "",
    success: `${targetUser.name} (${targetUser.email}) was removed.`,
  };
}
