import "server-only";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { convertImageFileToDataUrl } from "@/lib/image-data-url";
import { prisma } from "@/lib/prisma";

const curatedGameSchema = z.object({
  eventId: z.string().trim().min(1),
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

const grimoireCuratedGameFieldLabels: Record<string, string> = {
  eventId: "Event",
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

type ExistingCuratedGameRecord = {
  adventureImagePath: string | null;
  eventId: string;
  id: string;
  slug: string;
};

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

  return { path: await convertImageFileToDataUrl(file) } as const;
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

export async function createCuratedGameRedirectPath(formData: FormData) {
  const parsed = curatedGameSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    details: formData.get("details"),
    startAt: formData.get("startAt"),
    dm: formData.get("dm"),
    tier: formData.get("tier"),
    ticketPrice: formData.get("ticketPrice"),
    ticketPriceUsd: formData.get("ticketPriceUsd"),
    seatCapacity: formData.get("seatCapacity"),
    gameCode: formData.get("gameCode"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    console.error("Failed to validate curated Grimoire game creation.", flattened);
    return buildGrimoireGameRedirect({
      details: formatCuratedGameValidationDetails(flattened.fieldErrors),
      status: "invalid",
    });
  }

  const normalizedSlug = slugifyGrimoireEventTitle(parsed.data.title);
  const startAt = parseDateOrNull(parsed.data.startAt);
  const adventureImageFile = formData.get("adventureImage");
  let adventureImagePath: string | null = null;

  if (!normalizedSlug) {
    return buildGrimoireGameRedirect({
      details: "Game title: Use at least one letter or number.",
      status: "invalid",
    });
  }

  if (!startAt) {
    return buildGrimoireGameRedirect({
      details: "Start time: Enter a valid date and time.",
      status: "invalid",
    });
  }

  const eventExists = await prisma.grimoireEvent.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true },
  });

  if (!eventExists) {
    return buildGrimoireGameRedirect({
      details: "Event: Choose an existing Grimoire event.",
      status: "invalid",
    });
  }

  if (isUploadedFile(adventureImageFile) && adventureImageFile.size > 0) {
    const uploadResult = await saveGrimoireAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return buildGrimoireGameRedirect({
        details: uploadResult.error,
        editEventId: parsed.data.eventId,
        status: "invalid",
      });
    }

    adventureImagePath = uploadResult.path;
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO GrimoireCuratedGame (
        id,
        eventId,
        slug,
        title,
        summary,
        details,
        adventureImagePath,
        startAt,
        dm,
        tier,
        ticketPrice,
        ticketPriceUsd,
        seatCapacity,
        gameCode,
        createdAt,
        updatedAt
      ) VALUES (
        ${crypto.randomUUID()},
        ${parsed.data.eventId},
        ${normalizedSlug},
        ${parsed.data.title},
        ${parsed.data.summary},
        ${JSON.stringify(parseTextareaLines(parsed.data.details))},
        ${adventureImagePath},
        ${startAt},
        ${parsed.data.dm},
        ${parsed.data.tier},
        ${parsed.data.ticketPrice},
        ${parsed.data.ticketPriceUsd},
        ${parsed.data.seatCapacity},
        ${parsed.data.gameCode || null},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    if (isHandledPrismaError(error)) {
      console.error("Failed to create curated Grimoire game.", error);
      return buildGrimoireGameRedirect({
        details:
          error.code === "P2002"
            ? `Game title: \`${parsed.data.title}\` creates a slug that is already in use.`
            : "The curated game could not be saved.",
        editEventId: parsed.data.eventId,
        status: "invalid",
      });
    }

    throw error;
  }

  revalidateGrimoirePaths({
    eventId: parsed.data.eventId,
    gameSlugs: [normalizedSlug],
  });

  return buildGrimoireGameRedirect({
    editEventId: parsed.data.eventId,
    status: "created",
  });
}

export async function updateCuratedGameRedirectPath(formData: FormData) {
  const gameId = formData.get("gameId");
  const parsedGameId = deleteGameSchema.safeParse({
    gameId,
  });

  const parsed = curatedGameSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    details: formData.get("details"),
    startAt: formData.get("startAt"),
    dm: formData.get("dm"),
    tier: formData.get("tier"),
    ticketPrice: formData.get("ticketPrice"),
    ticketPriceUsd: formData.get("ticketPriceUsd"),
    seatCapacity: formData.get("seatCapacity"),
    gameCode: formData.get("gameCode"),
  });

  if (!parsedGameId.success || !parsed.success) {
    const flattened = parsed.success
      ? { fieldErrors: {} as Record<string, string[] | undefined> }
      : parsed.error.flatten();
    return buildGrimoireGameRedirect({
      details: parsed.success
        ? "The selected curated game could not be found."
        : formatCuratedGameValidationDetails(flattened.fieldErrors),
      editGameId: parsedGameId.success ? parsedGameId.data.gameId : undefined,
      status: "invalid",
    });
  }

  const normalizedSlug = slugifyGrimoireEventTitle(parsed.data.title);
  const startAt = parseDateOrNull(parsed.data.startAt);
  const adventureImageFile = formData.get("adventureImage");

  if (!normalizedSlug) {
    return buildGrimoireGameRedirect({
      details: "Game title: Use at least one letter or number.",
      editGameId: parsedGameId.data.gameId,
      status: "invalid",
    });
  }

  if (!startAt) {
    return buildGrimoireGameRedirect({
      details: "Start time: Enter a valid date and time.",
      editGameId: parsedGameId.data.gameId,
      status: "invalid",
    });
  }

  const [existingGameRows, eventExists] = await Promise.all([
    prisma.$queryRaw<ExistingCuratedGameRecord[]>`
      SELECT id, eventId, slug, adventureImagePath
      FROM GrimoireCuratedGame
      WHERE id = ${parsedGameId.data.gameId}
      LIMIT 1
    `,
    prisma.grimoireEvent.findUnique({
      where: { id: parsed.data.eventId },
      select: { id: true },
    }),
  ]);
  const existingGame = existingGameRows[0] ?? null;

  if (!existingGame || !eventExists) {
    return buildGrimoireGameRedirect({
      details: "Event: Choose an existing Grimoire event.",
      editGameId: parsedGameId.data.gameId,
      status: "invalid",
    });
  }

  let adventureImagePath = existingGame.adventureImagePath;

  if (isUploadedFile(adventureImageFile) && adventureImageFile.size > 0) {
    const uploadResult = await saveGrimoireAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return buildGrimoireGameRedirect({
        details: uploadResult.error,
        editEventId: parsed.data.eventId,
        editGameId: parsedGameId.data.gameId,
        status: "invalid",
      });
    }

    adventureImagePath = uploadResult.path;
  }

  try {
    await prisma.$executeRaw`
      UPDATE GrimoireCuratedGame
      SET
        eventId = ${parsed.data.eventId},
        slug = ${normalizedSlug},
        title = ${parsed.data.title},
        summary = ${parsed.data.summary},
        details = ${JSON.stringify(parseTextareaLines(parsed.data.details))},
        adventureImagePath = ${adventureImagePath},
        startAt = ${startAt},
        dm = ${parsed.data.dm},
        tier = ${parsed.data.tier},
        ticketPrice = ${parsed.data.ticketPrice},
        ticketPriceUsd = ${parsed.data.ticketPriceUsd},
        seatCapacity = ${parsed.data.seatCapacity},
        gameCode = ${parsed.data.gameCode || null},
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ${existingGame.id}
    `;
  } catch (error) {
    if (isHandledPrismaError(error)) {
      console.error("Failed to update curated Grimoire game.", error);
      return buildGrimoireGameRedirect({
        details:
          error.code === "P2002"
            ? `Game title: \`${parsed.data.title}\` creates a slug that is already in use.`
            : "The curated game could not be saved.",
        editEventId: parsed.data.eventId,
        editGameId: parsedGameId.data.gameId,
        status: "invalid",
      });
    }

    throw error;
  }

  revalidateGrimoirePaths({
    eventId: existingGame.eventId,
    gameSlugs: [existingGame.slug],
  });
  revalidateGrimoirePaths({
    eventId: parsed.data.eventId,
    gameSlugs: [normalizedSlug],
  });

  return buildGrimoireGameRedirect({
    editEventId: parsed.data.eventId,
    status: "updated",
  });
}
