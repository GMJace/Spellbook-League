import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canViewPrivateCharacterRoster, canViewPublicCharacterRoster } from "@/lib/character-visibility";
import { syncDndBeyondCharacter } from "@/lib/dnd-beyond-character-sync";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request, process.env.APP_BASE_URL)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await requireUser({ allowMissingDiscord: true });
  const { id } = await context.params;
  const character = await prisma.character.findUnique({ where: { id }, select: { userId: true, isPubliclyViewable: true } });
  if (!character || !(character.userId === user.id || (character.isPubliclyViewable && canViewPublicCharacterRoster(user)) || await canViewPrivateCharacterRoster(user))) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }
  // The saved link is authoritative. Requests cannot supply a different URL or arbitrary character data.
  const result = await syncDndBeyondCharacter(prisma, id);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
