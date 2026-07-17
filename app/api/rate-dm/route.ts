import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRateDmGameOptionById,
  isFutureDateInput,
  isValidDateInput,
} from "@/lib/pro-dm-rating";
import { addProDmReview } from "@/lib/pro-dm-reviews";
import { getProDmRosterEntry } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";

const rateDmSchema = z.object({
  userId: z.string().min(1),
  gameId: z.string().min(1),
  game: z.string().trim().min(1).max(200),
  date: z
    .string()
    .trim()
    .refine((value) => isValidDateInput(value), {
      message: "Choose a valid game date.",
    })
    .refine((value) => !isFutureDateInput(value), {
      message: "You can only rate games that have already been played.",
    }),
  rating: z.number().int().min(1).max(5),
  notes: z.string().trim().max(4000).optional().default(""),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please log in before rating a professional DM." },
      { status: 401 }
    );
  }

  const parsed = rateDmSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Please provide the game, date, rating, and any notes you want to share.",
      },
      { status: 400 }
    );
  }

  const rosterEntry = await getProDmRosterEntry(parsed.data.userId);

  if (!rosterEntry?.isListed) {
    return NextResponse.json({ error: "That DM is not available for public rating." }, { status: 404 });
  }

  const dm = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!dm) {
    return NextResponse.json({ error: "That DM could not be found." }, { status: 404 });
  }

  const game = await getRateDmGameOptionById(
    parsed.data.userId,
    session.user.id,
    parsed.data.gameId
  );

  if (!game) {
    return NextResponse.json(
      { error: "Choose a completed game you actually played with this DM." },
      { status: 400 }
    );
  }

  if (parsed.data.game !== game.game || parsed.data.date !== game.date) {
    return NextResponse.json(
      { error: "Please use the game and date attached to your selected session." },
      { status: 400 }
    );
  }

  await addProDmReview({
    userId: parsed.data.userId,
    game: game.game,
    date: game.date,
    rating: parsed.data.rating,
    notes: parsed.data.notes,
  });

  revalidatePath("/hire-a-dm");
  revalidatePath(`/hire-a-dm/${parsed.data.userId}`);
  revalidatePath(`/hire-a-dm/${parsed.data.userId}/rate`);
  revalidatePath("/admin/users");

  return NextResponse.json({ success: true });
}
