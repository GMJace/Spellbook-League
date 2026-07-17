"use server";

import { Prisma } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";
import { createNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { sendGrimoireSubmissionStatusEmail } from "@/lib/transactional-email";
import {
  createCuratedGameRedirectPath,
  updateCuratedGameRedirectPath,
} from "@/app/admin/grimoire-gathering/curated-game-mutations";

const moderationSchema = z.object({
  submissionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

const eventFieldsSchema = z.object({
  label: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(200),
  date: z.string().trim().min(1),
  displayDate: z.string().trim().min(1).max(200),
  theme: z.string().trim().min(1).max(200),
  themeDetails: z.string().trim().min(1),
  focus: z.string().trim().min(1).max(2000),
  ticketLabel: z.string().trim().min(1).max(120),
  ticketPrice: z.string().trim().min(1).max(80),
  ticketPriceUsd: z.coerce.number().min(0),
  slots: z.string().trim().min(1),
});

const createEventSchema = eventFieldsSchema;

const updateEventSchema = eventFieldsSchema.extend({
  eventId: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
});

const deleteEventSchema = z.object({
  eventId: z.string().trim().min(1),
});

const curatedGameSchema = z.object({
  eventId: z.string().trim().min(1),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1),
  details: z.string().trim().min(1),
  startAt: z.string().trim().min(1),
  dm: z.string().trim().min(1).max(80),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  ticketPrice: z.string().trim().min(1).max(40),
  ticketPriceUsd: z.coerce.number().min(0),
  seatCapacity: z.coerce.number().int().min(1).max(12),
  gameCode: z.string().trim().optional(),
});

const deleteGameSchema = z.object({
  gameId: z.string().trim().min(1),
});

const MAX_GRIMOIRE_COVER_IMAGE_SIZE = 5 * 1024 * 1024;

function parseDateOrNull(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string" &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function"
  );
}

async function saveGrimoireAdventureImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return { error: "Adventure cover must be an image file." } as const;
  }

  if (file.size > MAX_GRIMOIRE_COVER_IMAGE_SIZE) {
    return { error: "Adventure cover must be 5 MB or smaller." } as const;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".png";
  const directory = path.join(process.cwd(), "public", "uploads", "grimoire-covers");
  const filename = `${crypto.randomUUID()}${extension.toLowerCase()}`;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);

  return { path: `/uploads/grimoire-covers/${filename}` } as const;
}

function parseTextareaLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugifyGrimoireEventTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildGrimoireEventIdFromTitle(value: string) {
  const slug = slugifyGrimoireEventTitle(value);
  return slug ? `ggcon-${slug}` : "";
}

function parseSlotLines(value: string) {
  const lines = parseTextareaLines(value);

  const slots = lines.map((line) => {
    const separatorIndex = line.indexOf("|");

    if (separatorIndex === -1) {
      return null;
    }

    const label = line.slice(0, separatorIndex).trim();
    const startAt = line.slice(separatorIndex + 1).trim();
    const parsedDate = parseDateOrNull(startAt);

    if (!label || !parsedDate) {
      return null;
    }

    return {
      label,
      startAt: parsedDate,
    };
  });

  return slots.every(Boolean) ? (slots as Array<{ label: string; startAt: Date }>) : null;
}

function hasDuplicateSlotStartTimes(slots: Array<{ label: string; startAt: Date }>) {
  const seen = new Set<string>();

  for (const slot of slots) {
    const key = slot.startAt.toISOString();

    if (seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
}

function formatGrimoireSlotDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Edmonton",
    timeZoneName: "short",
  }).format(value);
}

function revalidateGrimoirePaths({
  eventId,
  gameSlugs = [],
}: {
  eventId?: string;
  gameSlugs?: string[];
} = {}) {
  revalidatePath("/admin/grimoire-gathering");
  revalidatePath("/grimoire-gathering");
  revalidatePath("/grimoire-gathering/cart");
  revalidatePath("/grimoire-gathering/dm");

  if (eventId) {
    revalidatePath(`/grimoire-gathering/events/${eventId}`);
  }

  for (const gameSlug of gameSlugs) {
    revalidatePath(`/grimoire-gathering/games/${gameSlug}`);
  }
}

function isHandledPrismaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

const grimoireEventFieldLabels: Record<string, string> = {
  label: "Month label",
  subtitle: "Event title",
  date: "Event date/time",
  displayDate: "Display date",
  theme: "Theme",
  themeDetails: "Theme details",
  focus: "Focus copy",
  ticketLabel: "Ticket label",
  ticketPrice: "Ticket display price",
  ticketPriceUsd: "Ticket price USD",
  slots: "Event slots",
};

const grimoireCuratedGameFieldLabels: Record<string, string> = {
  eventId: "Event",
  slug: "Slug",
  title: "Game title",
  summary: "Summary",
  details: "Game details",
  startAt: "Start time",
  dm: "Dungeon Master",
  tier: "Tier",
  ticketPrice: "Ticket display price",
  ticketPriceUsd: "Ticket price USD",
  seatCapacity: "Seats",
  gameCode: "Game code",
};

function formatGrimoireEventValidationDetails(
  fieldErrors: Record<string, string[] | undefined>,
) {
  return Object.entries(fieldErrors)
    .flatMap(([field, messages]) => {
      const message = messages?.[0];

      if (!message) {
        return [];
      }

      return [`${grimoireEventFieldLabels[field] ?? field}: ${message}`];
    })
    .join(" | ");
}

function formatCuratedGameValidationDetails(
  fieldErrors: Record<string, string[] | undefined>,
) {
  return Object.entries(fieldErrors)
    .flatMap(([field, messages]) => {
      const message = messages?.[0];

      if (!message) {
        return [];
      }

      return [`${grimoireCuratedGameFieldLabels[field] ?? field}: ${message}`];
    })
    .join(" | ");
}

function buildGrimoireEventRedirect({
  details,
  editEventId,
  status,
}: {
  details?: string;
  editEventId?: string;
  status: string;
}) {
  const params = new URLSearchParams({ event: status });

  if (details) {
    params.set("eventDetails", details);
  }

  if (editEventId) {
    params.set("editEvent", editEventId);
  }

  return `/admin/grimoire-gathering?${params.toString()}`;
}

function buildGrimoireGameRedirect({
  details,
  editEventId,
  editGameId,
  status,
}: {
  details?: string;
  editEventId?: string;
  editGameId?: string;
  status: string;
}) {
  const params = new URLSearchParams({ game: status });

  if (details) {
    params.set("gameDetails", details);
  }

  if (editGameId) {
    params.set("editGame", editGameId);
  }

  if (editEventId) {
    params.set("editEvent", editEventId);
  }

  const hash = editGameId
    ? "#edit-curated-game"
    : editEventId
      ? ""
      : "#create-curated-game";

  return `/admin/grimoire-gathering?${params.toString()}${hash}`;
}

type ExistingCuratedGameRecord = {
  adventureImagePath: string | null;
  eventId: string;
  id: string;
  slug: string;
};

export async function createGrimoireEvent(formData: FormData) {
  await requireAdminUser();

  const parsed = createEventSchema.safeParse({
    label: formData.get("label"),
    subtitle: formData.get("subtitle"),
    date: formData.get("date"),
    displayDate: formData.get("displayDate"),
    theme: formData.get("theme"),
    themeDetails: formData.get("themeDetails"),
    focus: formData.get("focus"),
    ticketLabel: formData.get("ticketLabel"),
    ticketPrice: formData.get("ticketPrice"),
    ticketPriceUsd: formData.get("ticketPriceUsd"),
    slots: formData.get("slots"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    console.error("Failed to validate Grimoire event creation.", flattened);
    redirect(
      buildGrimoireEventRedirect({
        details: formatGrimoireEventValidationDetails(flattened.fieldErrors),
        status: "invalid-fields",
      }),
    );
  }

  const date = parseDateOrNull(parsed.data.date);
  const slots = parseSlotLines(parsed.data.slots);
  const generatedEventId = buildGrimoireEventIdFromTitle(parsed.data.subtitle);

  if (!generatedEventId) {
    redirect(
      buildGrimoireEventRedirect({
        details: "Event title: Use at least one letter or number.",
        status: "invalid-fields",
      }),
    );
  }

  if (!date || !slots?.length) {
    redirect(buildGrimoireEventRedirect({ status: "invalid-slots" }));
  }

  if (hasDuplicateSlotStartTimes(slots)) {
    redirect(buildGrimoireEventRedirect({ status: "duplicate-slots" }));
  }

  const existingEvent = await prisma.grimoireEvent.findUnique({
    where: { id: generatedEventId },
    select: { id: true },
  });

  if (existingEvent) {
    redirect(buildGrimoireEventRedirect({ status: "duplicate-id" }));
  }

  try {
    await prisma.grimoireEvent.create({
      data: {
        id: generatedEventId,
        label: parsed.data.label,
        subtitle: parsed.data.subtitle,
        date,
        displayDate: parsed.data.displayDate,
        theme: parsed.data.theme,
        themeDetails: JSON.stringify(parseTextareaLines(parsed.data.themeDetails)),
        focus: parsed.data.focus,
        ticketLabel: parsed.data.ticketLabel,
        ticketPrice: parsed.data.ticketPrice,
        ticketPriceUsd: parsed.data.ticketPriceUsd,
        finale: true,
        slots: {
          create: slots,
        },
      },
    });
  } catch (error) {
    if (isHandledPrismaError(error)) {
      console.error("Failed to create Grimoire event.", error);
      if (error.code === "P2002") {
        redirect(buildGrimoireEventRedirect({ status: "duplicate-id" }));
      }

      redirect(buildGrimoireEventRedirect({ status: "invalid-save" }));
    }

    throw error;
  }

  revalidateGrimoirePaths({ eventId: generatedEventId });
  redirect("/admin/grimoire-gathering?event=created");
}

export async function updateGrimoireEvent(formData: FormData) {
  await requireAdminUser();

  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    label: formData.get("label"),
    subtitle: formData.get("subtitle"),
    date: formData.get("date"),
    displayDate: formData.get("displayDate"),
    theme: formData.get("theme"),
    themeDetails: formData.get("themeDetails"),
    focus: formData.get("focus"),
    ticketLabel: formData.get("ticketLabel"),
    ticketPrice: formData.get("ticketPrice"),
    ticketPriceUsd: formData.get("ticketPriceUsd"),
    slots: formData.get("slots"),
  });

  const editEventQuery = typeof formData.get("eventId") === "string"
    ? String(formData.get("eventId"))
    : undefined;

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    console.error("Failed to validate Grimoire event update.", flattened);
    redirect(
      buildGrimoireEventRedirect({
        details: formatGrimoireEventValidationDetails(flattened.fieldErrors),
        editEventId: editEventQuery,
        status: "invalid-fields",
      }),
    );
  }

  const date = parseDateOrNull(parsed.data.date);
  const slots = parseSlotLines(parsed.data.slots);

  if (!date || !slots?.length) {
    redirect(
      buildGrimoireEventRedirect({
        editEventId: parsed.data.eventId,
        status: "invalid-slots",
      }),
    );
  }

  const existingEvent = await prisma.grimoireEvent.findUnique({
    where: { id: parsed.data.eventId },
    include: {
      slots: {
        orderBy: { startAt: "asc" },
      },
      curatedGames: {
        select: {
          slug: true,
        },
      },
      submissions: {
        select: {
          id: true,
          slotStartAt: true,
          status: true,
        },
      },
    },
  });

  if (!existingEvent) {
    redirect(
      buildGrimoireEventRedirect({
        editEventId: parsed.data.eventId,
        status: "invalid-save",
      }),
    );
  }

  if (existingEvent.submissions.length > 0 && existingEvent.slots.length !== slots.length) {
    redirect(
      buildGrimoireEventRedirect({
        editEventId: parsed.data.eventId,
        status: "invalid-slot-count",
      }),
    );
  }

  const submissionIdsBySlot = new Map<string, string[]>();

  for (const submission of existingEvent.submissions) {
    const key = submission.slotStartAt.toISOString();
    const slotSubmissionIds = submissionIdsBySlot.get(key) ?? [];
    slotSubmissionIds.push(submission.id);
    submissionIdsBySlot.set(key, slotSubmissionIds);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.grimoireEvent.update({
        where: { id: existingEvent.id },
        data: {
          label: parsed.data.label,
          subtitle: parsed.data.subtitle,
          date,
          displayDate: parsed.data.displayDate,
          theme: parsed.data.theme,
          themeDetails: JSON.stringify(parseTextareaLines(parsed.data.themeDetails)),
          focus: parsed.data.focus,
          ticketLabel: parsed.data.ticketLabel,
          ticketPrice: parsed.data.ticketPrice,
          ticketPriceUsd: parsed.data.ticketPriceUsd,
        },
      });

      if (existingEvent.submissions.length > 0) {
        for (const [index, oldSlot] of existingEvent.slots.entries()) {
          const newSlot = slots[index];
          const submissionIds = submissionIdsBySlot.get(oldSlot.startAt.toISOString()) ?? [];

          if (!submissionIds.length) {
            continue;
          }

          await tx.grimoireDmSubmission.updateMany({
            where: {
              id: {
                in: submissionIds,
              },
            },
            data: {
              slotStartAt: newSlot.startAt,
            },
          });
        }
      }

      await tx.grimoireEventSlot.deleteMany({
        where: { eventId: existingEvent.id },
      });

      await tx.grimoireEventSlot.createMany({
        data: slots.map((slot) => ({
          eventId: existingEvent.id,
          label: slot.label,
          startAt: slot.startAt,
        })),
      });
    });
  } catch (error) {
    if (isHandledPrismaError(error)) {
      console.error("Failed to update Grimoire event.", error);
      redirect(
        buildGrimoireEventRedirect({
          editEventId: parsed.data.eventId,
          status: "invalid-save",
        }),
      );
    }

    throw error;
  }

  const relatedGameSlugs = [
    ...existingEvent.curatedGames.map((game) => game.slug),
    ...existingEvent.submissions
      .filter((submission) => submission.status === "APPROVED")
      .map((submission) => `submission-${submission.id}`),
  ];

  revalidateGrimoirePaths({
    eventId: parsed.data.eventId,
    gameSlugs: relatedGameSlugs,
  });
  redirect(
    buildGrimoireEventRedirect({
      editEventId: parsed.data.eventId,
      status: "updated",
    }),
  );
}

export async function deleteGrimoireEvent(formData: FormData) {
  await requireAdminUser();

  const parsed = deleteEventSchema.safeParse({
    eventId: formData.get("eventId"),
  });

  if (!parsed.success) {
    redirect(buildGrimoireEventRedirect({ status: "invalid-save" }));
  }

  const existingEvent = await prisma.grimoireEvent.findUnique({
    where: { id: parsed.data.eventId },
    select: {
      id: true,
      curatedGames: {
        select: {
          slug: true,
        },
      },
      submissions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!existingEvent) {
    redirect(buildGrimoireEventRedirect({ status: "invalid-save" }));
  }

  try {
    await prisma.grimoireEvent.delete({
      where: { id: existingEvent.id },
    });
  } catch (error) {
    if (isHandledPrismaError(error)) {
      console.error("Failed to delete Grimoire event.", error);
      redirect(buildGrimoireEventRedirect({ status: "invalid-save" }));
    }

    throw error;
  }

  const relatedGameSlugs = [
    ...existingEvent.curatedGames.map((game) => game.slug),
    ...existingEvent.submissions
      .filter((submission) => submission.status === "APPROVED")
      .map((submission) => `submission-${submission.id}`),
  ];

  revalidateGrimoirePaths({
    eventId: existingEvent.id,
    gameSlugs: relatedGameSlugs,
  });
  redirect("/admin/grimoire-gathering?event=deleted");
}

export async function createGrimoireCuratedGame(formData: FormData) {
  await requireAdminUser();
  redirect(await createCuratedGameRedirectPath(formData));
}

export async function updateGrimoireCuratedGame(formData: FormData) {
  await requireAdminUser();
  redirect(await updateCuratedGameRedirectPath(formData));
}

export async function deleteGrimoireCuratedGame(formData: FormData) {
  await requireAdminUser();

  const parsed = deleteGameSchema.safeParse({
    gameId: formData.get("gameId"),
  });

  if (!parsed.success) {
    redirect("/admin/grimoire-gathering?game=invalid");
  }

  const existingGame = await prisma.grimoireCuratedGame.findUnique({
    where: { id: parsed.data.gameId },
    select: {
      id: true,
      eventId: true,
      slug: true,
    },
  });

  if (!existingGame) {
    redirect("/admin/grimoire-gathering?game=invalid");
  }

  try {
    await prisma.grimoireCuratedGame.delete({
      where: { id: existingGame.id },
    });
  } catch (error) {
    if (isHandledPrismaError(error)) {
      redirect("/admin/grimoire-gathering?game=invalid");
    }

    throw error;
  }

  revalidateGrimoirePaths({
    eventId: existingGame.eventId,
    gameSlugs: [existingGame.slug],
  });
  redirect("/admin/grimoire-gathering?game=deleted");
}

export async function moderateGrimoireDmSubmission(formData: FormData) {
  const adminUser = await requireAdminUser();

  const parsed = moderationSchema.safeParse({
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
  });

  if (!parsed.success) {
    redirect("/admin/grimoire-gathering?review=invalid");
  }

  const submission = await prisma.grimoireDmSubmission.findUnique({
    where: { id: parsed.data.submissionId },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      eventId: true,
      slotStartAt: true,
      event: {
        select: {
          subtitle: true,
          displayDate: true,
          slots: {
            orderBy: { startAt: "asc" },
            select: {
              label: true,
              startAt: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    redirect("/admin/grimoire-gathering?review=invalid");
  }

  try {
    await prisma.grimoireDmSubmission.update({
      where: { id: submission.id },
      data: {
        status: parsed.data.decision,
        reviewedAt: new Date(),
      },
    });
  } catch (error) {
    if (isHandledPrismaError(error)) {
      redirect("/admin/grimoire-gathering?review=invalid");
    }

    throw error;
  }

  const matchedSlot =
    submission.event.slots.find(
      (slot) => slot.startAt.getTime() === submission.slotStartAt.getTime(),
    ) ?? null;
  const slotLabel = matchedSlot?.label ?? "Scheduled slot";
  const slotDateTime = formatGrimoireSlotDateTime(submission.slotStartAt);
  const isApproved = parsed.data.decision === "APPROVED";
  const actionHref = isApproved
    ? `/grimoire-gathering/games/submission-${submission.id}`
    : "/grimoire-gathering/dm";

  const submitterUser = await prisma.user.findUnique({
    where: {
      email: submission.email.toLowerCase(),
    },
    select: {
      id: true,
    },
  });

  if (submitterUser) {
    await createNotifications(prisma, [
      {
        userId: submitterUser.id,
        createdByUserId: adminUser.id,
        type: "SYSTEM",
        title: `${isApproved ? "Submission approved" : "Submission not approved"}: ${submission.title}`,
        body: isApproved
          ? `Your Grimoire Gathering submission for ${submission.event.subtitle} was approved and is now live on the public board.`
          : `Your Grimoire Gathering submission for ${submission.event.subtitle} was reviewed but was not approved for the public board.`,
        details: [
          { label: "Event", value: submission.event.subtitle },
          { label: "Dates", value: submission.event.displayDate },
          { label: "Slot", value: `${slotLabel} - ${slotDateTime}` },
        ],
        actionLabel: isApproved ? "View public listing" : "Review DM page",
        actionHref,
      },
    ]);
  }

  try {
    await sendGrimoireSubmissionStatusEmail({
      name: submission.name,
      to: submission.email,
      submissionTitle: submission.title,
      eventSubtitle: submission.event.subtitle,
      eventDisplayDate: submission.event.displayDate,
      slotLabel,
      slotDateTime,
      decision: parsed.data.decision,
      actionPath: actionHref,
    });
  } catch (error) {
    console.error("Failed to send Grimoire DM moderation status email.", error);
  }

  revalidateGrimoirePaths({
    eventId: submission.eventId,
    gameSlugs: [`submission-${submission.id}`],
  });

  redirect(
    `/admin/grimoire-gathering?review=${
      parsed.data.decision === "APPROVED" ? "approved" : "rejected"
    }`,
  );
}
