import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationDetailItem = {
  label: string;
  value: string;
};

export type UserNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  details: NotificationDetailItem[];
  actionLabel: string | null;
  actionHref: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationDbClient = Prisma.TransactionClient | typeof prisma;

type CreateNotificationInput = {
  userId: string;
  createdByUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  details?: NotificationDetailItem[];
  actionLabel?: string | null;
  actionHref?: string | null;
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeDetails(details: NotificationDetailItem[] = []) {
  return details
    .map((detail) => ({
      label: normalizeText(detail.label),
      value: normalizeText(detail.value),
    }))
    .filter((detail) => detail.label && detail.value)
    .slice(0, 8);
}

function parseDetails(detailsJson: string) {
  try {
    const parsed = JSON.parse(detailsJson);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeDetails(
      parsed.filter(
        (detail): detail is NotificationDetailItem =>
          Boolean(
            detail &&
              typeof detail === "object" &&
              typeof detail.label === "string" &&
              typeof detail.value === "string"
          )
      )
    );
  } catch {
    return [];
  }
}

function serializeDetails(details: NotificationDetailItem[] = []) {
  return JSON.stringify(normalizeDetails(details));
}

function mapNotification(
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    detailsJson: string;
    actionLabel: string | null;
    actionHref: string | null;
    isRead: boolean;
    createdAt: Date;
  }
): UserNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    details: parseDetails(notification.detailsJson),
    actionLabel: notification.actionLabel,
    actionHref: notification.actionHref,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function getUserNotifications(userId: string, limit = 8) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: limit,
  });

  return notifications.map(mapNotification);
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function createNotification(
  db: NotificationDbClient,
  input: CreateNotificationInput
) {
  const title = normalizeText(input.title);
  const body = normalizeText(input.body);

  if (!input.userId || !title || !body) {
    return null;
  }

  return db.notification.create({
    data: {
      userId: input.userId,
      createdByUserId: input.createdByUserId ?? null,
      type: input.type,
      title,
      body,
      detailsJson: serializeDetails(input.details),
      actionLabel: input.actionLabel?.trim() || null,
      actionHref: input.actionHref?.trim() || null,
    },
  });
}

export async function createNotifications(
  db: NotificationDbClient,
  inputs: CreateNotificationInput[]
) {
  const normalizedInputs = inputs.filter(
    (input) => input.userId && input.title.trim() && input.body.trim()
  );

  if (!normalizedInputs.length) {
    return;
  }

  await db.notification.createMany({
    data: normalizedInputs.map((input) => ({
      userId: input.userId,
      createdByUserId: input.createdByUserId ?? null,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      detailsJson: serializeDetails(input.details),
      actionLabel: input.actionLabel?.trim() || null,
      actionHref: input.actionHref?.trim() || null,
    })),
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: {
      id: true,
      isRead: true,
    },
  });

  if (!notification || notification.isRead) {
    return;
  }

  await prisma.notification.update({
    where: {
      id: notification.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}
