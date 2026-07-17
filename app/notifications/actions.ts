"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  markAllNotificationsRead as markAllStoredNotificationsRead,
  markNotificationRead as markStoredNotificationRead,
} from "@/lib/notifications";

async function requireNotificationUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

export async function markNotificationRead(formData: FormData) {
  const userId = await requireNotificationUserId();

  if (!userId) {
    return;
  }

  const notificationId = String(formData.get("notificationId") ?? "").trim();

  if (!notificationId) {
    return;
  }

  await markStoredNotificationRead(userId, notificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(_formData?: FormData) {
  const userId = await requireNotificationUserId();

  if (!userId) {
    return;
  }

  await markAllStoredNotificationsRead(userId);
  revalidatePath("/", "layout");
}
