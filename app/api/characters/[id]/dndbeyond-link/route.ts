import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { isDndBeyondLink, parseDndBeyondLink } from "@/lib/dnd-beyond-character-import";
import { syncDndBeyondCharacter } from "@/lib/dnd-beyond-character-sync";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/request-origin";

export const runtime = "nodejs";

const linkSchema = z.object({ link: z.string().trim().max(500) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request, process.env.APP_BASE_URL)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireUser({ allowMissingDiscord: true });
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid link request." }, { status: 400 });
  }
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid character link." }, { status: 400 });
  const link = parsed.data.link;
  if (link) {
    try {
      const url = parseDndBeyondLink(link);
      if (!/^\/(?:profile\/[^/]+\/)?characters\/\d+\/?$/.test(url.pathname)) {
        return NextResponse.json({ error: "Use a full D&D Beyond character link." }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid character link." }, { status: 400 });
    }
  }
  const character = await prisma.character.findFirst({
    where: { id, ...(!isAdminEmail(user.email) ? { userId: user.id } : {}) },
    select: { characterSheetLink: true },
  });
  if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });
  if (character.characterSheetLink !== (link || null)) {
    await prisma.character.update({ where: { id }, data: {
      characterSheetLink: link || null,
      dndBeyondSyncLink: null,
      dndBeyondData: null,
      dndBeyondSyncedAt: null,
      dndBeyondAttemptAt: null,
      dndBeyondError: null,
    } });
    if (isDndBeyondLink(link)) await syncDndBeyondCharacter(prisma, id);
  }
  return NextResponse.json({ link }, { headers: { "Cache-Control": "no-store" } });
}
